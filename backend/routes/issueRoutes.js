const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  createIssue,
  getIssues,
  getMyIssues,
  getStatsSummary,
  getIssueById,
  updateIssue,
  updateIssueStatus,
  deleteIssue,
} = require("../controllers/issueController");

// All issue routes require a logged-in user (citizen or admin)
router.use(protect);

// Specific/static paths must come before "/:id" so they aren't
// swallowed by the dynamic route.
router.get("/my", getMyIssues);
router.get("/stats/summary", getStatsSummary);

router.route("/")
  .post(createIssue)          // Create
  .get(getIssues);            // Read (all, with ?status=&category= filters)

router.route("/:id")
  .get(getIssueById)          // Read (one)
  .put(updateIssue)           // Update (owner citizen or admin)
  .delete(deleteIssue);       // Delete (owner citizen or admin)

// Admin-only: triage workflow (status changes, priority assignment)
router.patch("/:id/status", authorize("admin"), updateIssueStatus);

module.exports = router;
