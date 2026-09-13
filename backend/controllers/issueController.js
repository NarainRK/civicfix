const Issue = require("../models/Issue");

// @route POST /api/issues  (citizen or admin)
exports.createIssue = async (req, res) => {
  try {
    const issue = await Issue.create({
      ...req.body,
      createdBy: req.user._id,
      reportedByName: req.user.name,
    });
    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    res.status(400).json({ success: false, message: "Validation error", error: err.message });
  }
};

// @route GET /api/issues  (any authenticated user; supports ?status=&category=)
exports.getIssues = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const issues = await Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Issue.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: issues,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @route GET /api/issues/my  (citizen's own reports)
exports.getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: issues.length, data: issues });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @route GET /api/issues/stats/summary
exports.getStatsSummary = async (req, res) => {
  try {
    const summary = await Issue.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @route GET /api/issues/:id
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    res.status(400).json({ success: false, message: "Invalid ID", error: err.message });
  }
};

// @route PUT /api/issues/:id  (owner citizen editing their own content, or admin)
exports.updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const isOwner = issue.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You can only edit your own issue reports" });
    }

    // Citizens editing their own report can change the descriptive fields,
    // but not directly overwrite status/priority — that's an admin action
    // via PATCH /:id/status, keeping the workflow's role boundaries clean.
    const { title, description, category, location } = req.body;
    const updatable = { title, description, category, location };
    Object.keys(updatable).forEach((key) => updatable[key] === undefined && delete updatable[key]);

    const updated = await Issue.findByIdAndUpdate(req.params.id, updatable, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: "Validation error", error: err.message });
  }
};

// @route PATCH /api/issues/:id/status  (admin only - status + priority triage)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;
    const update = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    update.assignedPriorityBy = req.user._id;

    const issue = await Issue.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }
    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    res.status(400).json({ success: false, message: "Validation error", error: err.message });
  }
};

// @route DELETE /api/issues/:id  (owner citizen or admin)
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const isOwner = issue.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You can only delete your own issue reports" });
    }

    await issue.deleteOne();
    res.status(200).json({ success: true, message: "Issue deleted", data: issue });
  } catch (err) {
    res.status(400).json({ success: false, message: "Invalid ID", error: err.message });
  }
};
