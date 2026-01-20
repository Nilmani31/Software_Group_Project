const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
	itemId: {
		type: String,
		required: true,
		unique: true,
		default: function() {
			// Combine category, name, and a unique number
			const cat = this.category ? this.category.toString() : 'CAT';
			const nm = this.name ? this.name.replace(/\s+/g, '').toUpperCase() : 'ITEM';
			const uniq = Date.now() + Math.floor(Math.random() * 1000);
			return `${cat}_${nm}_${uniq}`;
		}
	},
	sku: {
		type: String,
		unique: true,
		sparse: true,
		default: null
	},
	barcode: {
		type: String,
		required: true,
		unique: true,
		default: function() {
			// Simple auto-generated barcode (could be replaced with a real barcode generator)
			const base = this.itemId || (this.category ? this.category.toString() : '') + (this.name ? this.name : '') + Date.now();
			return Buffer.from(base).toString('hex').slice(0, 12).toUpperCase();
		}
	},
	name: {
		type: String,
		required: true,
	},
	category: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		required: true,
	},
	unit: {
		type: String,
		required: false,
		default: 'kg',
	},
	quantity: {
		type: Number,
		required: false,
		default: 0,
	},
	branch: {
		type: String,
		required: false,
		default: 'Colombo',
	},
	status: {
		type: String,
		required: false,
		default: 'normal',
		enum: ['normal', 'low', 'out'],
	},

	minStock: {
		type: Number,
		required: false,
		default: 0,
	},
	maxStock: {
		type: Number,
		required: false,
		default: 1000,
	},
	image: {
		type: String,
		required: false,
		default: '', // Store image URL or path
	},
	
	description: {
		type: String,
		default: '',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Item', itemSchema);
