const IssueNote = require('../models/issueNotes');
const IssueNoteItem = require('../models/issueNoteItems');
const Stock = require('../models/stock');
const Item = require('../models/items');
const Branch = require('../models/branches');
const User = require('../models/users');
const { getIssueNoteBranchFilter } = require('../utils/branchFilter');

// Get all issue notes with populated fields
exports.getAllIssueNotes = async (req, res) => {
  try {
    const branchFilter = getIssueNoteBranchFilter(req);
    const issueNotes = await IssueNote.find(branchFilter)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    
    // Fetch items for each issue note with full item details
    const issueNotesWithItems = await Promise.all(issueNotes.map(async (note) => {
      const items = await IssueNoteItem.find({ issueNoteId: note._id })
        .populate({
          path: 'itemId',
          select: 'name sku itemId unit description category'
        })
        .populate('itemUnitId', 'unitName')
        .select('-__v')
        .lean();
      return { ...note, items };
    }));
    
    console.log('📊 Fetching all issue notes, total:', issueNotesWithItems.length);
    res.json(issueNotesWithItems);
  } catch (err) {
    console.error('❌ Error fetching issue notes:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get issue note by ID with items
exports.getIssueNoteById = async (req, res) => {
  try {
    const issueNote = await IssueNote.findById(req.params.id)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .select('-__v')
      .lean();
    
    if (!issueNote) {
      return res.status(404).json({ error: 'Issue note not found' });
    }

    // Get all items for this issue note with full details
    const items = await IssueNoteItem.find({ issueNoteId: issueNote._id })
      .populate('itemId', 'name sku itemId unit description category')
      .populate('itemUnitId', 'unitName')
      .select('-__v')
      .lean();
    
    const result = {
      ...issueNote,
      items: items
    };
    
    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching issue note:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get issue notes by branch (from or to)
exports.getIssueNotesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const branchFilter = getIssueNoteBranchFilter(req);
    
    const issueNotes = await IssueNote.find({
      $and: [
        branchFilter,
        {
          $or: [
            { fromBranchId: branchId },
            { toBranchId: branchId }
          ]
        }
      ]
    })
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    
    // Fetch items for each issue note
    const issueNotesWithItems = await Promise.all(issueNotes.map(async (note) => {
      const items = await IssueNoteItem.find({ issueNoteId: note._id })
        .populate('itemId', 'name sku itemId unit')
        .populate('itemUnitId', 'unitName')
        .lean();
      return { ...note, items };
    }));
    
    res.json(issueNotesWithItems);
  } catch (err) {
    console.error('❌ Error fetching issue notes by branch:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Create new issue note with items
exports.createIssueNote = async (req, res) => {
  try {
    console.log('📝 Creating issue note. Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      fromBranchId,
      toBranchId,
      issuedBy,
      purpose,
      remarks,
      items
    } = req.body;

    console.log('Extracted fields:', {
      fromBranchId,
      toBranchId,
      issuedBy,
      purpose,
      itemsCount: items?.length
    });

    // Validate required fields
    if (!fromBranchId || !issuedBy || !items || items.length === 0) {
      console.error('❌ Validation failed:', { fromBranchId, issuedBy, items: items?.length });
      return res.status(400).json({ 
        error: 'Missing required fields: fromBranchId, issuedBy, and items are required' 
      });
    }

    // Validate branch exists - if not, create a default branch
    let fromBranch = await Branch.findById(fromBranchId);
    if (!fromBranch) {
      console.warn('⚠️ From branch not found, creating default branch...');
      
      fromBranch = await Branch.create({
        branchName: 'Main Branch',
        branchCode: 'MAIN',
        location: 'Head Office',
        city: 'Main City',
        state: 'Main State',
        address: 'Main Office Address',
        phoneNumber: '0000000000',
        email: 'main@company.com'
      });
      
      console.log('✅ Default branch created:', fromBranch._id);
    }

    if (toBranchId) {
      const toBranch = await Branch.findById(toBranchId);
      if (!toBranch) {
        return res.status(404).json({ error: 'To branch not found' });
      }
    }

    // Validate user exists - if not, create a default system user
    let user = await User.findById(issuedBy);
    if (!user) {
      console.warn('⚠️ User not found, creating default system user...');
      
      // Create a default system user
      user = await User.create({
        name: 'System User',
        username: 'system',
        email: 'system@company.com',
        password: 'system123', // This should be hashed in production
        role: 'admin',
        phoneNumber: '0000000000'
      });
      
      console.log('✅ Default system user created:', user._id);
    }

    // Validate stock availability for all items
    for (const item of items) {
      // Validate that item exists
      const itemExists = await Item.findById(item.itemId);
      if (!itemExists) {
        return res.status(404).json({
          error: `Item not found: ${item.itemId}`
        });
      }

      const stockRecord = await Stock.findOne({
        itemId: item.itemId,
        branchId: fromBranchId
      });

      if (!stockRecord || stockRecord.quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for item: ${itemExists.name}. Available: ${stockRecord?.quantity || 0}, Required: ${item.quantity}`
        });
      }
    }

    // Create issue note
    const issueNote = new IssueNote({
      issueNoteNumber: `IN-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromBranchId,
      toBranchId,
      issuedBy: user._id,
      purpose,
      remarks,
      status: 'pending'
    });

    await issueNote.save();

    // Create issue note items and calculate total
    let totalAmount = 0;
    const issueNoteItems = [];

    for (const item of items) {
      const issueNoteItem = new IssueNoteItem({
        issueNoteId: issueNote._id,
        itemId: item.itemId,
        itemUnitId: item.itemUnitId,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        remarks: item.remarks
      });

      await issueNoteItem.save();
      issueNoteItems.push(issueNoteItem);
      totalAmount += issueNoteItem.totalPrice;
    }

    // Update total amount in issue note
    issueNote.totalAmount = totalAmount;
    await issueNote.save();

    // Populate the response with full details
    const populatedIssueNote = await IssueNote.findById(issueNote._id)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .lean();

    // Populate items with full item details
    const populatedItems = await Promise.all(issueNoteItems.map(async (item) => {
      const populatedItem = await IssueNoteItem.findById(item._id)
        .populate('itemId', 'name sku itemId unit description')
        .populate('itemUnitId', 'unitName')
        .lean();
      return populatedItem;
    }));

    console.log('✅ Issue note created:', issueNote.issueNoteNumber);
    res.status(201).json({
      ...populatedIssueNote,
      items: populatedItems
    });
  } catch (err) {
    console.error('❌ Error creating issue note:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Approve issue note and update stock
exports.approveIssueNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'approvedBy is required' });
    }

    const issueNote = await IssueNote.findById(id);
    if (!issueNote) {
      return res.status(404).json({ error: 'Issue note not found' });
    }

    if (issueNote.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot approve issue note with status: ${issueNote.status}` 
      });
    }

    // Validate approver exists
    const approver = await User.findById(approvedBy);
    if (!approver) {
      return res.status(404).json({ error: 'Approver not found' });
    }

    // Get all items for this issue note
    const issueNoteItems = await IssueNoteItem.find({ issueNoteId: id })
      .populate('itemId', 'name sku');

    // Update stock: deduct from source branch
    for (const item of issueNoteItems) {
      // Deduct from source branch
      const fromStock = await Stock.findOne({
        itemId: item.itemId,
        branchId: issueNote.fromBranchId
      });

      if (!fromStock || fromStock.quantity < item.quantity) {
        const itemName = item.itemId?.name || 'Unknown Item';
        return res.status(400).json({
          error: `Insufficient stock for item: ${itemName}. Available: ${fromStock?.quantity || 0}, Required: ${item.quantity}`
        });
      }

      fromStock.quantity -= item.quantity;
      fromStock.updatedAt = new Date();
      await fromStock.save();

      console.log(`✅ Deducted ${item.quantity} of ${item.itemId?.name} from source branch`);

      // If toBranchId exists, add to destination branch
      if (issueNote.toBranchId) {
        let toStock = await Stock.findOne({
          itemId: item.itemId,
          branchId: issueNote.toBranchId
        });

        if (toStock) {
          toStock.quantity += item.quantity;
          toStock.updatedAt = new Date();
          await toStock.save();
          console.log(`✅ Added ${item.quantity} of ${item.itemId?.name} to destination branch`);
        } else {
          // Create new stock record for destination branch
          toStock = new Stock({
            itemId: item.itemId,
            itemUnitId: item.itemUnitId,
            branchId: issueNote.toBranchId,
            quantity: item.quantity,
            minStockLevel: 0,
            maxStockLevel: 1000
          });
          await toStock.save();
          console.log(`✅ Created new stock record with ${item.quantity} of ${item.itemId?.name} in destination branch`);
        }
      }
    }

    // Update issue note status
    issueNote.status = 'approved';
    issueNote.approvedBy = approvedBy;
    await issueNote.save();

    const updatedIssueNote = await IssueNote.findById(id)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .lean();

    // Get populated items
    const items = await IssueNoteItem.find({ issueNoteId: id })
      .populate('itemId', 'name sku itemId unit')
      .populate('itemUnitId', 'unitName')
      .lean();

    console.log('✅ Issue note approved:', issueNote.issueNoteNumber);
    res.json({ ...updatedIssueNote, items });
  } catch (err) {
    console.error('❌ Error approving issue note:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Reject issue note
exports.rejectIssueNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, remarks } = req.body;

    if (!approvedBy) {
      return res.status(400).json({ error: 'approvedBy is required' });
    }

    const issueNote = await IssueNote.findById(id);
    if (!issueNote) {
      return res.status(404).json({ error: 'Issue note not found' });
    }

    if (issueNote.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot reject issue note with status: ${issueNote.status}` 
      });
    }

    // Validate approver exists
    const approver = await User.findById(approvedBy);
    if (!approver) {
      return res.status(404).json({ error: 'Approver not found' });
    }

    issueNote.status = 'rejected';
    issueNote.approvedBy = approvedBy;
    if (remarks) {
      issueNote.remarks = remarks;
    }
    await issueNote.save();

    const updatedIssueNote = await IssueNote.findById(id)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .lean();

    // Get populated items
    const items = await IssueNoteItem.find({ issueNoteId: id })
      .populate('itemId', 'name sku itemId unit')
      .populate('itemUnitId', 'unitName')
      .lean();

    console.log('✅ Issue note rejected:', issueNote.issueNoteNumber);
    res.json({ ...updatedIssueNote, items });
  } catch (err) {
    console.error('❌ Error rejecting issue note:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Update issue note (only if pending)
exports.updateIssueNote = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const issueNote = await IssueNote.findById(id);
    if (!issueNote) {
      return res.status(404).json({ error: 'Issue note not found' });
    }

    if (issueNote.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot update issue note with status: ${issueNote.status}` 
      });
    }

    // Update allowed fields
    const allowedUpdates = ['purpose', 'remarks', 'toBranchId'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        issueNote[field] = updates[field];
      }
    });

    await issueNote.save();

    const updatedIssueNote = await IssueNote.findById(id)
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .lean();

    // Get populated items
    const items = await IssueNoteItem.find({ issueNoteId: id })
      .populate('itemId', 'name sku itemId unit')
      .populate('itemUnitId', 'unitName')
      .lean();

    console.log('✅ Issue note updated:', issueNote.issueNoteNumber);
    res.json({ ...updatedIssueNote, items });
  } catch (err) {
    console.error('❌ Error updating issue note:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Delete issue note (only if pending)
exports.deleteIssueNote = async (req, res) => {
  try {
    const { id } = req.params;

    const issueNote = await IssueNote.findById(id);
    if (!issueNote) {
      return res.status(404).json({ error: 'Issue note not found' });
    }

    if (issueNote.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot delete issue note with status: ${issueNote.status}. Only pending issue notes can be deleted.` 
      });
    }

    // Delete all associated items
    await IssueNoteItem.deleteMany({ issueNoteId: id });

    // Delete the issue note
    await IssueNote.findByIdAndDelete(id);

    console.log('✅ Issue note deleted:', issueNote.issueNoteNumber);
    res.json({ 
      message: 'Issue note deleted successfully',
      issueNoteNumber: issueNote.issueNoteNumber 
    });
  } catch (err) {
    console.error('❌ Error deleting issue note:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get issue note statistics
exports.getIssueNoteStats = async (req, res) => {
  try {
    const stats = await IssueNote.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const total = await IssueNote.countDocuments();
    
    res.json({
      total,
      byStatus: stats
    });
  } catch (err) {
    console.error('❌ Error fetching issue note stats:', err.message);
    res.status(500).json({ error: err.message });
  }
};
