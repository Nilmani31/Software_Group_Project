import React, { useState } from 'react';
import { FaTimes, FaImage } from 'react-icons/fa';
import '../Pages/Inventory.css';

const FindItemByImageModal = ({ isOpen, onClose, onAddAsNew }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchCompleted, setSearchCompleted] = useState(false);

  // Mock data for similar items
  const mockResults = [
    {
      id: '1',
      name: 'Organic Coffee Beans',
      sku: 'SKU-CAT-001',
      category: 'Beverages',
      matchPercentage: 95,
      image: 'https://via.placeholder.com/80?text=Coffee'
    },
    {
      id: '2',
      name: 'Premium Ground Coffee',
      sku: 'SKU-CAT-002',
      category: 'Beverages',
      matchPercentage: 88,
      image: 'https://via.placeholder.com/80?text=Ground+Coffee'
    },
    {
      id: '3',
      name: 'Instant Coffee Mix',
      sku: 'SKU-CAT-003',
      category: 'Beverages',
      matchPercentage: 82,
      image: 'https://via.placeholder.com/80?text=Instant+Coffee'
    }
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setSelectedImage(file);
        setSearchCompleted(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearchSimilarItems = () => {
    if (selectedImage) {
      // TODO: Connect to backend API for image search
      console.log('Searching for similar items with image:', selectedImage);
      setSearchCompleted(true);
    }
  };

  const handleUseThisItem = (item) => {
    console.log('Using item:', item);
    // TODO: Implement logic to use selected item
  };

  const handleAddAsNewItem = () => {
    if (onAddAsNew) {
      onAddAsNew(imagePreview);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSearchCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-inventory" onClick={handleClose}>
      <div className="modal-content-inventory" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-inventory">
          <div className="modal-title-section-inventory">
            <h2 className="modal-title-inventory">Find Item by Image</h2>
            <p className="modal-subtitle-inventory">Upload a product image to find similar items in the inventory</p>
          </div>
          <button className="modal-close-btn-inventory" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-inventory">
          {/* Upload Section */}
          <div className="form-group-inventory">
            <label className="form-label-inventory">Upload Image</label>
            <div className="image-upload-box-inventory">
              {imagePreview ? (
                <div className="image-preview-content-inventory">
                  <img src={imagePreview} alt="Selected product" />
                </div>
              ) : (
                <div className="upload-placeholder-inventory">
                  <FaImage className="upload-icon-inventory" style={{ fontSize: '48px' }} />
                  <span className="upload-text-inventory">Upload image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="find-image-input"
              />
              <label htmlFor="find-image-input" className="upload-label-inventory"></label>
            </div>
          </div>

          {/* Search Button */}
          <div style={{ marginTop: '16px' }}>
            <button
              className="modal-btn-inventory submit"
              onClick={handleSearchSimilarItems}
              disabled={!selectedImage}
              style={{
                width: '100%',
                opacity: !selectedImage ? 0.5 : 1,
                cursor: !selectedImage ? 'not-allowed' : 'pointer'
              }}
            >
              Search Similar Items
            </button>
          </div>

          {/* Results Section */}
          {searchCompleted && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1a3a52',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Similar Items
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {mockResults.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f4ff';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Item Image */}
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1px solid #d8bfd8'
                      }}
                    />

                    {/* Item Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '13px',
                        color: '#1a3a52',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6f7990',
                        display: 'flex',
                        gap: '12px'
                      }}>
                        <span>{item.sku}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                    </div>

                    {/* Match Percentage */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginRight: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `conic-gradient(#667eea 0deg ${item.matchPercentage * 3.6}deg, #e5e7eb ${item.matchPercentage * 3.6}deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#667eea'
                        }}>
                          {item.matchPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Use This Item Button */}
                    <button
                      onClick={() => handleUseThisItem(item)}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                      }}
                    >
                      Use This Item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-inventory">
          <button type="button" className="modal-btn-inventory cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="modal-btn-inventory submit" onClick={handleAddAsNewItem}>
            Add As New Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default FindItemByImageModal;
