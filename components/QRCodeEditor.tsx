import React, { useRef, useEffect, useState } from 'react';
import QRCodeStyling from "qr-code-styling";

type QRCodeOptions = {
  width: number;
  height: number;
  margin: number;
  dotsOptions: {
    type: string;
    color: string;
    gradient: {
      type: string;
      rotation: number;
      colorStops: Array<{ offset: number; color: string; }>;
    };
  };
  backgroundOptions: {
    color: string;
  };
  cornersSquareOptions: {
    type: string;
    color: string;
  };
  cornersDotOptions: {
    type: string;
    color: string;
  };
  qrOptions: {
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  };
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin?: string;
    imageSize?: number;
  };
  image: string;
};

interface QRCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeOptions: QRCodeOptions;
  onOptionsChange: (newOptions: QRCodeOptions) => void;
  url: string;
}

const QRCodeEditor: React.FC<QRCodeEditorProps> = ({
  isOpen,
  onClose,
  qrCodeOptions,
  onOptionsChange,
  url
}) => {
  const previewQrRef = useRef<HTMLDivElement>(null);
  const previewQrCode = useRef<QRCodeStyling | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string>('');
  const [qrCodeOptionsState, setQrCodeOptions] = useState(qrCodeOptions);

  useEffect(() => {
    if (previewQrRef.current && isOpen) {
      if (!previewQrCode.current) {
        previewQrCode.current = new QRCodeStyling({
          ...qrCodeOptionsState,
          data: url
        });
      }
      
      previewQrRef.current.innerHTML = '';
      previewQrCode.current.append(previewQrRef.current);
    }
  }, [isOpen, url, qrCodeOptionsState]);

  useEffect(() => {
    if (url && previewQrCode.current) {
      previewQrCode.current.update({
        data: url,
        ...qrCodeOptionsState
      });
    }
  }, [url, qrCodeOptionsState]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setLogoFile(file);
        const newOptions = {
          ...qrCodeOptionsState,
          image: result
        };
        setQrCodeOptions(newOptions);
        onOptionsChange(newOptions);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Customize QR Code</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  min="100"
                  max="1000"
                  value={qrCodeOptionsState.width}
                  onChange={(e) => setQrCodeOptions({
                    ...qrCodeOptionsState,
                    width: parseInt(e.target.value),
                    height: parseInt(e.target.value) // Keep aspect ratio
                  })}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Margin
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={qrCodeOptionsState.margin}
                  onChange={(e) => setQrCodeOptions({
                    ...qrCodeOptionsState,
                    margin: parseInt(e.target.value)
                  })}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Error Correction Level
              </label>
              <select
                value={qrCodeOptionsState.qrOptions.errorCorrectionLevel}
                onChange={(e) => setQrCodeOptions({
                  ...qrCodeOptionsState,
                  qrOptions: {
                    ...qrCodeOptionsState.qrOptions,
                    errorCorrectionLevel: e.target.value
                  }
                })}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dots Color
                </label>
                <input
                  type="color"
                  value={qrCodeOptionsState.dotsOptions.color}
                  onChange={(e) => setQrCodeOptions({
                    ...qrCodeOptionsState,
                    dotsOptions: {
                      ...qrCodeOptionsState.dotsOptions,
                      color: e.target.value
                    }
                  })}
                  className="w-full p-1 h-10 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Background Color
                </label>
                <input
                  type="color"
                  value={qrCodeOptionsState.backgroundOptions.color}
                  onChange={(e) => setQrCodeOptions({
                    ...qrCodeOptionsState,
                    backgroundOptions: {
                      ...qrCodeOptionsState.backgroundOptions,
                      color: e.target.value
                    }
                  })}
                  className="w-full p-1 h-10 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Border Style
              </label>
              <select
                value={qrCodeOptionsState.dotsOptions.type}
                onChange={(e) => {
                  const type = e.target.value;
                  setQrCodeOptions({
                    ...qrCodeOptionsState,
                    dotsOptions: {
                      ...qrCodeOptionsState.dotsOptions,
                      type
                    },
                    cornersSquareOptions: {
                      ...qrCodeOptionsState.cornersSquareOptions,
                      type: type === 'dots' ? 'dot' : type
                    },
                    cornersDotOptions: {
                      ...qrCodeOptionsState.cornersDotOptions,
                      type: type === 'dots' ? 'dot' : type
                    }
                  });
                }}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="square">Square</option>
                <option value="dots">Dots</option>
                <option value="rounded">Rounded</option>
                <option value="extra-rounded">Extra Rounded</option>
                <option value="classy">Classy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo Image
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Logo
                </label>
                {logoPreview && (
                  <div className="relative w-20 h-20 border dark:border-gray-600 rounded-md overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview('');
                        setQrCodeOptions({
                          ...qrCodeOptionsState,
                          image: ''
                        });
                      }}
                      className="absolute top-1 right-1 p-1 bg-gray-800 bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                    >
                      <span className="sr-only">Remove logo</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {logoFile && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Logo Size</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      value={qrCodeOptionsState.imageOptions.imageSize}
                      onChange={(e) => {
                        const newSize = parseFloat(e.target.value);
                        setQrCodeOptions({
                          ...qrCodeOptionsState,
                          imageOptions: {
                            ...qrCodeOptionsState.imageOptions,
                            imageSize: newSize
                          }
                        });
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {Math.round(qrCodeOptionsState.imageOptions.imageSize * 100)}%
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Logo Margin</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={qrCodeOptionsState.imageOptions.margin}
                      onChange={(e) => {
                        setQrCodeOptions({
                          ...qrCodeOptionsState,
                          imageOptions: {
                            ...qrCodeOptionsState.imageOptions,
                            margin: parseInt(e.target.value)
                          }
                        });
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {qrCodeOptionsState.imageOptions.margin}px
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hideBackgroundDots"
                      checked={qrCodeOptionsState.imageOptions.hideBackgroundDots}
                      onChange={(e) => {
                        setQrCodeOptions({
                          ...qrCodeOptionsState,
                          imageOptions: {
                            ...qrCodeOptionsState.imageOptions,
                            hideBackgroundDots: e.target.checked
                          }
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="hideBackgroundDots" className="text-sm text-gray-700 dark:text-gray-300">
                      Hide Background Dots
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview
              </label>
              <div className="border dark:border-gray-600 rounded-md p-4 flex justify-center items-center min-h-[300px]">
                <div ref={previewQrRef} className="max-w-full" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onOptionsChange(qrCodeOptionsState);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeEditor;
