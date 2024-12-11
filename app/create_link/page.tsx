'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';
import QRCodeStyling from "qr-code-styling";
import { z } from "zod";
import debounce from 'lodash.debounce';

const createLinkSchema = z.object({
  longUrl: z.string()
    .min(1, "Long URL is required")
    .url("Please enter a valid URL"),
  shortUrl: z.string().min(1, "Short URL is required"),
  name: z.string().min(1, "Link name is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CreateLinkFormData = z.infer<typeof createLinkSchema>;

interface Tag {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent_tag_id: string | null;
  team_id: string;
  is_shared: boolean;
  schema_version: number;
  is_system: boolean;
}

export default function CreateLink() {
  const router = useRouter();
  const { team, project } = useTeam();
  const [shareName, setShareName] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [longUrl, setLongUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CreateLinkFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [newTag, setNewTag] = useState({
    name: '',
    type: 'Priority'
  });
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrOptions, setQrOptions] = useState<{
    dotsType: "dots" | "rounded" | "square";
    dotsColor: string;
    backgroundColor: string;
  }>({
    dotsType: "dots",
    dotsColor: "#000000",
    backgroundColor: "#FFFFFF",
  });
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  type DotsType = "dots" | "rounded" | "square";

  const domain = "upj.to";

  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const debouncedFetchMeta = useCallback(
    debounce(async (url: string) => {
      if (!url) return;
      
      setIsLoadingMeta(true);
      setMetaError(null);

      try {
        const response = await fetch(`/api/meta?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch URL metadata');
        }

        const data = await response.json();
        
        // Update the form with meta data
        if (data.title && !title) {
          setTitle(data.title);
        }
        if (data.description && !description) {
          setDescription(data.description);
        }
        if (data.image) {
          setImageUrl(data.image);
        }
      } catch (error) {
        console.error('Error fetching meta:', error);
        setMetaError(error instanceof Error ? error.message : 'Failed to fetch URL metadata');
      } finally {
        setIsLoadingMeta(false);
      }
    }, 500),
    [title, description]
  );

  useEffect(() => {
    if (longUrl) {
      debouncedFetchMeta(longUrl);
    }
  }, [longUrl, debouncedFetchMeta]);

  useEffect(() => {
    const fetchTags = async () => {
      if (!team?.id) return;
      
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?teamId=${team.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [team?.id]);

  useEffect(() => {
    if (!qrRef.current) return;

    if (!qrCode.current) {
      qrCode.current = new QRCodeStyling({
        width: 200,
        height: 200,
        type: "canvas",
        data: shortUrl ? `https://${domain}/${shortUrl}` : `https://${domain}/`,
        margin: 8,
        qrOptions: {
          errorCorrectionLevel: "L"
        },
        dotsOptions: {
          type: qrOptions.dotsType as any,
          color: qrOptions.dotsColor
        },
        backgroundOptions: {
          color: qrOptions.backgroundColor
        }
      });
      qrCode.current.append(qrRef.current);
    } else {
      qrCode.current.update({
        data: shortUrl ? `https://${domain}/${shortUrl}` : `https://${domain}/`,
        dotsOptions: {
          type: qrOptions.dotsType as any,
          color: qrOptions.dotsColor
        },
        backgroundOptions: {
          color: qrOptions.backgroundColor
        }
      });
    }
  }, [shortUrl, qrOptions, domain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const formData = {
        longUrl,
        shortUrl,
        name: shareName,
        title,
        description,
        tags: selectedTags,
      };
      
      const validatedData = createLinkSchema.parse(formData);
      
      const supabase = createClient();
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
          
        if (!session?.access_token) {
          throw new Error('Please login to create a link');
        }

        if (!process.env.NEXT_PUBLIC_API_URL) {
          throw new Error('API URL is not configured');
        }

        // Use meta image URL if available, otherwise use default
        const finalImageUrl = imageUrl || 'https://picsum.photos/200';

        // Create shorturl
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resource/shorturl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            type: 'shorturl',
            attributes: {
              icon: finalImageUrl
            },
            shortUrl: {
              url: validatedData.longUrl,
              slug: validatedData.shortUrl || undefined,
              image: finalImageUrl,
              title: validatedData.title || '',
              description: validatedData.description || ''
            },
            teamId: team?.id,
            projectId: project?.id,
            qrcodeOption: {
              options: {
                width: 400,
                height: 400,
                margin: 4,
              },
              saveAsTemplate: false,
              storeImage: true
            }
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || `Server error: ${response.status}`);
        }

        // Redirect to link list page
        router.push('/link_list');
      } catch (error) {
        console.error('Error creating link:', error);
        if (error instanceof Error) {
          setSubmitError(error.message);
        } else {
          setSubmitError('Failed to create link. Please try again later.');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof CreateLinkFormData, string>> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof CreateLinkFormData;
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex items-center p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Cancel
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-gray-900 dark:text-gray-100">Create Link</h1>
        <div className="w-[32px]"></div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{submitError}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Long URL
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter long URL"
              required
            />
            {isLoadingMeta && (
              <p className="mt-1 text-sm text-gray-500">Loading URL information...</p>
            )}
            {metaError && (
              <p className="mt-1 text-sm text-red-500">{metaError}</p>
            )}
            {errors.longUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.longUrl}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Short URL
              <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="flex items-center px-3 rounded-l-md border border-r-0 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {domain}
              </span>
              <input
                type="text"
                value={shortUrl}
                onChange={(e) => setShortUrl(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter short URL"
                required
              />
            </div>
            {errors.shortUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.shortUrl}</p>
            )}
          </div>

          <div className="flex-shrink-0 p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 relative group w-[220px]">
            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <div 
              ref={qrRef} 
              className="w-[200px] h-[200px] flex items-center justify-center"
            >
              {!shortUrl && (
                <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm0 4h3v2h-3v-2zM13 13h3v2h-3v-2zm0 4h3v2h-3v-2z" fill="currentColor"/>
                </svg>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link Name
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter link name"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag.id));
                    } else {
                      setSelectedTags([...selectedTags, tag.id]);
                    }
                  }}
                  className={`px-3 py-1 rounded-md flex items-center ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsCreateTagModalOpen(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              + Create New Tag
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              maxLength={120}
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">{title.length}/120</div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Please enter..."
              rows={4}
              maxLength={240}
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">{description.length}/240</div>
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {imageUrl && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preview Image
              </label>
              <div className="relative w-full h-48 border dark:border-gray-600 rounded-md overflow-hidden">
                <img
                  src={imageUrl}
                  alt="URL preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-gray-800 bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
      {isCreateTagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Create New Tag</h3>
              <button onClick={() => setIsCreateTagModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter tag name"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsCreateTagModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!team?.id) return;
                    
                    const supabase = createClient();
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) return;

                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                          name: newTag.name,
                          type: newTag.type,
                          attributes: {},
                          team_id: team.id,
                          is_shared: true,
                          schema_version: 1,
                          is_system: false
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to create tag');
                      }

                      // Refresh tags list
                      const tagsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?teamId=${team.id}`, {
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`
                        }
                      });
                      
                      if (tagsResponse.ok) {
                        const data = await tagsResponse.json();
                        setTags(data);
                      }

                      setIsCreateTagModalOpen(false);
                      setNewTag({
                        name: '',
                        type: 'Priority'
                      });
                    } catch (error) {
                      console.error('Error creating tag:', error);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isQRModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Customize QR Code</h3>
              <button onClick={() => setIsQRModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dot Style</label>
                <select 
                  value={qrOptions.dotsType}
                  onChange={(e) => setQrOptions({...qrOptions, dotsType: e.target.value as DotsType})}
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="dots">Dots</option>
                  <option value="rounded">Rounded Square</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dot Color</label>
                <input 
                  type="color"
                  value={qrOptions.dotsColor}
                  onChange={(e) => setQrOptions({...qrOptions, dotsColor: e.target.value})}
                  className="w-full p-1 border dark:border-gray-600 rounded-md bg-white h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Color</label>
                <input 
                  type="color"
                  value={qrOptions.backgroundColor}
                  onChange={(e) => setQrOptions({...qrOptions, backgroundColor: e.target.value})}
                  className="w-full p-1 border dark:border-gray-600 rounded-md bg-white h-10"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  qrCode.current?.update({
                    dotsOptions: {
                      type: qrOptions.dotsType,
                      color: qrOptions.dotsColor
                    },
                    backgroundOptions: {
                      color: qrOptions.backgroundColor
                    }
                  });
                  setIsQRModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
