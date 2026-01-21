const express = require('express');
const router = express.Router();
const issueNotesController = require('../controllers/issueNotes');

// GET issue note statistics
router.get('/stats', issueNotesController.getIssueNoteStats);

// GET issue notes by branch
router.get('/branch/:branchId', issueNotesController.getIssueNotesByBranch);

// GET all issue notes
router.get('/', issueNotesController.getAllIssueNotes);

// GET issue note by ID
router.get('/:id', issueNotesController.getIssueNoteById);

// POST create new issue note
router.post('/', issueNotesController.createIssueNote);

// PUT approve issue note
router.put('/:id/approve', issueNotesController.approveIssueNote);

// PUT reject issue note
router.put('/:id/reject', issueNotesController.rejectIssueNote);

// PUT update issue note (only pending)
router.put('/:id', issueNotesController.updateIssueNote);

// DELETE issue note (only pending)
router.delete('/:id', issueNotesController.deleteIssueNote);

module.exports = router;
