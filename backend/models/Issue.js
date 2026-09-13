const mongoose = require("mongoose");

const IssueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Pothole",
        "Garbage",
        "Streetlight",
        "Water Supply",
        "Drainage",
        "Illegal Construction",
        "Other",
      ],
      default: "Other",
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedByName: {
      // Denormalized copy of the reporter's name for fast list rendering
      // without needing a populate() on every request.
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    assignedPriorityBy: {
      // Which admin last set the priority/status (audit trail)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Index to speed up common filter queries (status, category) - a small
// demonstration of cloud DB query optimization.
IssueSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model("Issue", IssueSchema);
