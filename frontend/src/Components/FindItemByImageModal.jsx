import React, { useState } from 'react';
import { FaTimes, FaImage, FaSpinner } from 'react-icons/fa';
import '../Pages/Inventory.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

const FindItemByImageModal = ({ isOpen, onClose, onAddAsNew }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setSelectedImage(file);
        setSearchCompleted(false);
        setError(null);
        setSearchResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearchSimilarItems = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const endpoint = `${API_BASE_URL}/image-search/search`;
      console.log('🔍 Starting image search...');
      console.log('📁 File:', selectedImage.name, selectedImage.size, 'bytes');
      console.log('🔑 FormData keys:', Array.from(formData.keys()));

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      console.log('📍 Response status:', response.status);
      console.log('📋 Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Server error (status ${response.status})`;

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.detail || errorMessage;
            console.log('📋 Error data:', errorData);
          } catch (e) {
            console.error('Failed to parse error JSON:', e);
          }
        } else {
          const text = await response.text();
          console.error('❌ Backend returned non-JSON response:', text.substring(0, 200));
          errorMessage = `Backend error: ${response.status} ${response.statusText}. Check console for details.`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Search completed:', data);
      console.log('📊 Received results:', data.results?.length || 0);

      setSearchResults(data.results || []);
      setSearchCompleted(true);
    } catch (err) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Failed to search for similar items. Please try again.');
      setSearchCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUseThisItem = (item) => {
    console.log('Using item:', item);
    if (onAddAsNew) {
      onAddAsNew({
        ...item,
        matchScore: item.score,
      });
    }
    handleClose();
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
            <div className="image-upload-box-inventory" style={{ position: 'relative' }}>
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
              <label
                htmlFor="find-image-input"
                className="upload-label-inventory"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  cursor: 'pointer',
                  zIndex: 10
                }}
              ></label>
            </div>
          </div>

          {/* Search Button */}
          <div style={{ marginTop: '16px' }}>
            <button
              className="modal-btn-inventory submit"
              onClick={handleSearchSimilarItems}
              disabled={!selectedImage || loading}
              style={{
                width: '100%',
                opacity: !selectedImage || loading ? 0.5 : 1,
                cursor: !selectedImage || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <FaSpinner style={{
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Searching...
                </>
              ) : (
                'Search Similar Items'
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '13px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Results Section */}
          {searchCompleted && searchResults.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1a3a52',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Similar Items ({searchResults.length})
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {searchResults.map((item, index) => {
                  const matchPercentage = Math.round((item.score || 0) * 100);
                  return (
                    <div
                      key={item.productId || index}
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
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid #d8bfd8'
                          }}
                        />
                      )}

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
                          background: `conic-gradient(#667eea 0deg ${matchPercentage * 3.6}deg, #e5e7eb ${matchPercentage * 3.6}deg)`,
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
                            {matchPercentage}%
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
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {searchCompleted && searchResults.length === 0 && !error && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px',
              color: '#166534',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              ℹ️ No similar items found in inventory. Would you like to add this as a new item?
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
