import React, { useState, useRef } from 'react';
import {
  FaTimes,
  FaImage,
  FaSpinner,
  FaCloudUploadAlt,
  FaSearch,
  FaCheckCircle,
  FaTrash,
  FaPlus,
  FaExternalLinkAlt
} from 'react-icons/fa';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

const FindItemByImageModal = ({ isOpen, onClose, onAddAsNew, onUseExistingItem }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSearchCompleted(false);
    setSearchResults([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSearchSimilarItems = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const endpoint = `${API_BASE_URL}/image-search/zero-shot`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Server error (status ${response.status})`;

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.detail || errorMessage;
          } catch (e) {
            console.error('Failed to parse error JSON:', e);
          }
        } else {
          errorMessage = `Backend error (${response.status} ${response.statusText})`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setSearchCompleted(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Search error:', err);
      setError(err.message || 'Failed to search for similar items. Please try again.');
      setSearchCompleted(false);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleUseThisItem = (item) => {
    if (onUseExistingItem) {
      onUseExistingItem(item);
    }
    handleClose();
  };

  const handleAddAsNewItem = () => {
    if (onAddAsNew) {
      onAddAsNew(imagePreview);
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setSelectedImage(null);
    setImagePreview(null);
    setSearchCompleted(false);
    setSearchResults([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-inventory" onClick={handleClose}>
      <div className="modal-content-inventory find-image-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-inventory">
          <div className="modal-title-section-inventory">
            <h2 className="modal-title-inventory">Find Item by Image</h2>
            <p className="modal-subtitle-inventory">
              Upload a reference product photo to visually match items in the inventory catalog
            </p>
          </div>
          <button className="modal-close-btn-inventory" onClick={handleClose} title="Close">
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-inventory">
          {/* Upload / Selected Photo Bar */}
          {!imagePreview ? (
            <div
              className={`image-dropzone-box ${isDragOver ? 'is-dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="image-dropzone-icon">
                <FaCloudUploadAlt />
              </div>
              <div className="image-dropzone-title">Upload Product Photo to Search</div>
              <div className="image-dropzone-sub">Drag & drop your image file here, or click to browse</div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                Supports PNG, JPG, JPEG or WebP (max 10MB)
              </div>
            </div>
          ) : (
            <div>
              <div className="find-image-selected-bar">
                <img src={imagePreview} alt="Selected" className="find-image-thumb" />
                <div className="find-image-meta">
                  <div className="find-image-name">{selectedImage?.name || 'Selected product image'}</div>
                  <div className="find-image-sub">
                    {selectedImage?.size ? `${(selectedImage.size / 1024).toFixed(1)} KB` : 'Ready for search'} • Image loaded
                  </div>
                </div>
                <div className="find-image-actions">
                  <button
                    type="button"
                    className="image-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change Photo"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="image-action-btn danger"
                    onClick={handleRemoveImage}
                    title="Remove Photo"
                  >
                    <FaTrash /> Remove
                  </button>
                </div>
              </div>

              {/* Prominent Search Action Button */}
              <div style={{ marginBottom: '18px' }}>
                <button
                  type="button"
                  className="modal-btn-inventory save"
                  onClick={handleSearchSimilarItems}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '42px',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                      Comparing against inventory catalog...
                    </>
                  ) : (
                    <>
                      <FaSearch /> Search Visual Matches
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Results Section */}
          {searchCompleted && searchResults.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  Visual Matches Found ({searchResults.length})
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Ranked by visual resemblance
                </div>
              </div>

              <div className="visual-matches-container">
                {searchResults.map((item, index) => {
                  const matchPercentage = Math.round((item.score || 0) * 100);
                  const scoreClass = matchPercentage >= 80 ? 'high' : matchPercentage >= 60 ? 'medium' : 'low';

                  return (
                    <div key={item.productId || item._id || index} className="visual-match-card">
                      {/* Image Thumbnail */}
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="visual-match-img" />
                      ) : (
                        <div
                          className="visual-match-img"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}
                        >
                          <FaImage />
                        </div>
                      )}

                      {/* Info */}
                      <div className="visual-match-info">
                        <div className="visual-match-title" title={item.name}>
                          {item.name}
                        </div>
                        <div className="visual-match-meta">
                          <span className="visual-match-sku">{item.sku || 'No SKU'}</span>
                          {item.category && (
                            <>
                              <span>•</span>
                              <span>{item.category}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Match Score */}
                      <div className={`visual-score-badge ${scoreClass}`}>
                        <FaCheckCircle style={{ fontSize: '11px' }} />
                        <span>{matchPercentage}% Match</span>
                      </div>

                      {/* Action */}
                      <button
                        type="button"
                        className="modal-btn-inventory edit"
                        onClick={() => handleUseThisItem(item)}
                        style={{ height: '34px', padding: '0 14px', fontSize: '12.5px', flexShrink: 0 }}
                      >
                        <FaExternalLinkAlt style={{ fontSize: '11px' }} /> View Item
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {searchCompleted && searchResults.length === 0 && !error && (
            <div
              style={{
                marginTop: '16px',
                padding: '24px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: '18px'
                }}
              >
                <FaImage />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                No Visual Matches Found
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '380px', margin: '0 auto 14px' }}>
                This item does not match any existing products in your inventory catalog. You can register it as a new product directly.
              </p>
              <button
                type="button"
                className="modal-btn-inventory save"
                onClick={handleAddAsNewItem}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPlus /> Add As New Item
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-inventory">
          <button type="button" className="modal-btn-inventory cancel" onClick={handleClose}>
            Cancel
          </button>
          {imagePreview && (
            <button
              type="button"
              className="modal-btn-inventory save"
              onClick={handleAddAsNewItem}
            >
              <FaPlus /> Add As New Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindItemByImageModal;