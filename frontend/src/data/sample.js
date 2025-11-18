export const categories = [
  { id: 1, name: 'Raw Materials', desc: 'Coffee beans, milk, syrups, juices and other consumables', items: 5, itemList: ['Coffee Beans', 'Milk', 'Syrup', 'Juice'] },
  { id: 2, name: 'Tools & Equipment', desc: 'Espresso machines, grinders, and other equipment', items: 2, itemList: ['Espresso Machine', 'Grinder'] },
  { id: 3, name: 'Glassware', desc: 'All types of glasses for bar and barista training', items: 3, itemList: ['Cups', 'Mugs', 'Glasses'] },
  { id: 4, name: 'Bar Materials', desc: 'Alcohol, shakers, bar tools and accessories', items: 4, itemList: ['Alcohol', 'Shakers', 'Bar Tools'] },
  { id: 5, name: 'Training Materials', desc: 'Manuals, workbooks, and training resources', items: 5, itemList: ['Manuals', 'Workbooks'] },
];

export const roles = [
  { id: 1, name: 'Administrator', desc: 'Description' },
  { id: 2, name: 'Director', desc: 'Description' },
  { id: 3, name: 'Manager', desc: 'Description' },
  { id: 4, name: 'Branch Manager', desc: 'Description' },
  { id: 5, name: 'Stock keeper', desc: 'Description' }
];

export const grns = [
  { id: 1, grn: 'GRN-2025-001', po: 'PO-2025-001', status: 'Received', date: '2025-10-20', by: 'John Doe', itemsReceived: 2, items: [
    {id: 'CB001', name: 'Coffee Beans', ordered: 10, received: 10, unit: 'kg', unitPrice: 1500},
    {id: 'SY001', name: 'Syrups', ordered: 5, received: 2, unit: 'bottle', unitPrice: 800}
  ]},
  { id: 2, grn: 'GRN-2025-002', po: 'PO-2025-002', status: 'Pending', date: '2025-10-22', by: 'Jane Smith', itemsReceived: 0, items: [
    {id: 'MD001', name: 'Milk & Dairy', ordered: 8, received: 0, unit: 'l', unitPrice: 300},
    {id: 'BK001', name: 'Bakery', ordered: 15, received: 0, unit: 'piece', unitPrice: 250}
  ] },
];

export const users = [
  { id: 1, name: 'Chamsha Nilmani', email: 'chamsha@example.com', branch: 'Galle', role: 'Manager' },
  { id: 2, name: 'John Doe', email: 'john.doe@example.com', branch: 'Colombo', role: 'Barista' },
  { id: 3, name: 'Jane Smith', email: 'jane.smith@example.com', branch: 'Kandy', role: 'Cashier' },
];