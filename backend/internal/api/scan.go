package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"visora-backend/internal/db"
	"visora-backend/internal/events"
)

// TriggerFullScan queues a fresh crawl → full pipeline for the project.
// Overlapping queued/running jobs for the same project are cancelled so
// restarts never pile duplicate pipelines.
func TriggerFullScan(c *gin.Context) {
	id := c.Param("id")

	var project db.Project
	if err := db.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	cancelInFlightJobs(project.ID)

	run := db.CrawlRun{
		ProjectID: project.ID,
		Status:    "running",
		Trigger:   "full_scan",
		MaxPages:  50,
		Stats:     "{}",
	}
	db.DB.Create(&run)

	payload, _ := json.Marshal(map[string]interface{}{
		"project_id":   project.ID,
		"crawl_run_id": run.ID,
		"start_url":    project.Website,
		"max_pages":    50,
	})

	db.DB.Create(&db.Job{
		Type:    "crawl",
		Payload: string(payload),
		Status:  "queued",
	})

	c.JSON(http.StatusOK, gin.H{
		"message":      "Scan triggered",
		"crawl_run_id": run.ID,
		"started_at":   time.Now().UTC(),
	})
}

// TriggerIntentRerun re-runs from buyer searches onward, using the saved
// crawl and the current positioning. Used after Settings edits.
func TriggerIntentRerun(c *gin.Context) {
	id := c.Param("id")

	var project db.Project
	if err := db.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	cancelInFlightJobs(project.ID)

	events.PublishEvent(project.ID, 4, "milestone", "Re-running searches from your positioning", map[string]interface{}{
		"pipeline_from": "search_intent",
		"positioning":   project.Positioning,
	})

	payload, _ := json.Marshal(map[string]interface{}{"project_id": project.ID})
	if err := db.DB.Create(&db.Job{
		Type:    "search_intent_run",
		Payload: string(payload),
		Status:  "queued",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue search re-run"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Search re-run queued",
		"started_at": time.Now().UTC(),
	})
}

func cancelInFlightJobs(projectID uint) {
	db.DB.Exec(`
		UPDATE jobs
		SET status = 'error',
		    error = 'superseded by new scan',
		    finished_at = NOW()
		WHERE status IN ('queued', 'running')
		  AND (payload->>'project_id')::int = ?`, projectID)
}

// StreamScanEvents is an SSE endpoint that streams ScanEvent records for the
// latest scan only (events at/after the newest crawl run), so reconnecting
// never replays an old stage-16 "complete" and skips the live journey.
func StreamScanEvents(c *gin.Context) {
	id := c.Param("id")

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	var latestCrawl db.CrawlRun
	db.DB.Where("project_id = ? AND competitor_id IS NULL", id).Order("id desc").First(&latestCrawl)

	since := time.Now().Add(-2 * time.Hour)
	if latestCrawl.ID > 0 && !latestCrawl.CreatedAt.IsZero() {
		since = latestCrawl.CreatedAt.Add(-2 * time.Second)
	}
	// A positioning re-run does not create a crawl; start the stream at that
	// marker so the previous stage-16 complete is not replayed.
	var intentRerun db.ScanEvent
	db.DB.Where("project_id = ? AND data->>'pipeline_from' = ?", id, "search_intent").
		Order("id desc").First(&intentRerun)
	if intentRerun.ID > 0 && intentRerun.CreatedAt.After(since) {
		since = intentRerun.CreatedAt.Add(-time.Second)
	}

	lastEventID := uint(0)

	for {
		select {
		case <-c.Request.Context().Done():
			return
		default:
			var events []db.ScanEvent
			db.DB.Where("project_id = ? AND id > ? AND created_at >= ?", id, lastEventID, since).
				Order("id asc").
				Find(&events)

			for _, event := range events {
				dataBytes, _ := json.Marshal(event)
				fmt.Fprintf(c.Writer, "data: %s\n\n", string(dataBytes))
				c.Writer.Flush()
				lastEventID = event.ID

				if event.EventType == "complete" && event.Stage == 16 {
					return
				}
			}

			fmt.Fprintf(c.Writer, ": keepalive\n\n")
			c.Writer.Flush()
			time.Sleep(1500 * time.Millisecond)
		}
	}
}
