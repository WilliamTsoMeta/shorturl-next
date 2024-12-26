'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTeam } from '@/lib/contexts/TeamContext';
import { useTeams } from '@/lib/hooks/useTeams';
import { useProjects } from '@/lib/hooks/useProjects';
import { z } from "zod";
import debounce from 'lodash.debounce';
import QRCodeStyling from "qr-code-styling";
import QRCodeEditor from "@/components/QRCodeEditor";
import { createPortal } from 'react-dom';
import { Header } from '@/components/Header';
import { useTranslations } from 'next-intl';

const createLinkSchema = z.object({
  longUrl: z.string()
    .min(1, 'Long URL is required')
    .url('Please enter a valid URL'),
  shortUrl: z.string().min(1, 'Short URL is required'),
  name: z.string().min(1, 'Link name is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  teamId: z.string().min(1, 'Team is required'),
  projectId: z.string().min(1, 'Project is required'),
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
  const t = useTranslations();
  const router = useRouter();
  const { team, project } = useTeam();
  const { teams, loading: teamsLoading } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(team?.id || null);
  const { projects, loading: projectsLoading } = useProjects(selectedTeamId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(project?.id || null);
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
  const qrCode = useRef<QRCodeStyling | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrCodeOptions, setQrCodeOptions] = useState({
    width: 200,
    height: 200,
    margin: 5,
    type: 'svg',
    dotsOptions: {
      type: 'square',
      color: '#000000',
      gradient: {
        type: 'linear',
        rotation: 0,
        colorStops: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#000000' }
        ]
      }
    },
    backgroundOptions: {
      color: '#ffffff',
    },
    cornersSquareOptions: {
      type: 'square',
      color: '#000000',
    },
    cornersDotOptions: {
      type: 'square',
      color: '#000000',
    },
    qrOptions: {
      errorCorrectionLevel: 'H'
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.3,
      margin: 5,
      crossOrigin: 'anonymous',
    }
  });

  useEffect(() => {
    if (qrRef.current && shortUrl) {
      if (!qrCode.current) {
        qrCode.current = new QRCodeStyling({
          ...qrCodeOptions,
          data: shortUrl
        });
      }

      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
      
      // Update QR code when options change
      qrCode.current.update({
        ...qrCodeOptions,
        data: shortUrl
      });
    }
  }, [shortUrl, qrCodeOptions]);

  const handleDownloadQRCode = () => {
    if (qrCode.current) {
      qrCode.current.download({
        extension: 'png'
      });
    }
  };

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
      if (!selectedTeamId) return;
      
      const supabase = createClient();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?teamId=${selectedTeamId}`, {
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
  }, [selectedTeamId]);

  const getSlugSuggestion = async (domain: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !process.env.NEXT_PUBLIC_API_URL) {
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resource/shorturl/slug?domain=${domain}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get slug suggestion');
      }

      const data = await response.json();
      setShortUrl(data.slug);
    } catch (error) {
      console.error('Error getting slug suggestion:', error);
    }
  };

  const debouncedGetSlug = useCallback(
    debounce((domain: string) => getSlugSuggestion(domain), 500),
    []
  );

  useEffect(() => {
    if (longUrl) {
      debouncedGetSlug('upj.to');
    }
  }, [longUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      const validatedData = createLinkSchema.parse({
        longUrl,
        shortUrl,
        name: shareName,
        title,
        description,
        tags: selectedTags,
        teamId: selectedTeamId,
        projectId: selectedProjectId,
      });
      
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
            type: "shorturl",
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
            teamId: validatedData.teamId,
            projectId: validatedData.projectId,
            qrcodeOption: {
              options: qrCodeOptions,
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

  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setLogoPreview(preview);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-4 mt-20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{submitError}</p>
              </div>
            )}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label htmlFor="team" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('selectors.team.label')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="team"
                  value={selectedTeamId || ''}
                  onChange={(e) => {
                    const newTeamId = e.target.value || null;
                    setSelectedTeamId(newTeamId);
                    setSelectedProjectId(null);
                  }}
                  className={`block w-full px-4 pr-8 py-3 text-base rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ${errors.teamId ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">{t('selectors.team.placeholder')}</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                {errors.teamId && (
                  <p className="mt-1 text-sm text-red-500">{errors.teamId}</p>
                )}
              </div>

              <div className="flex-1">
                <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('selectors.project.label')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="project"
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                  className={`block w-full px-4 pr-8 py-3 text-base rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ${errors.projectId ? 'border-red-500' : ''}`}
                  disabled={!selectedTeamId || projectsLoading}
                  required
                >
                  <option value="">{t('selectors.project.placeholder')}</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('links.longUrl')}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={t('links.enterLongUrl')}
                required
              />
              {isLoadingMeta && (
                <p className="mt-1 text-sm text-gray-500">{t('links.loadingUrlInfo')}</p>
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
                {t('links.shortUrl')}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <span className="flex items-center px-3 rounded-l-md border border-r-0 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  upj.to
                </span>
                <input
                  type="text"
                  value={shortUrl}
                  onChange={(e) => setShortUrl(e.target.value)}
                  className="w-full p-2 border dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={t('links.enterShortUrl')}
                  required
                />
              </div>
              {errors.shortUrl && (
                <p className="mt-1 text-sm text-red-500">{errors.shortUrl}</p>
              )}
            </div>

            <div className="relative mt-4">
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('links.qrCode')}</h3>
                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">{t('links.editQRCode')}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <div className="flex justify-center">
                  <div className="w-[200px] h-[200px] relative">
                    <div ref={qrRef} className="absolute inset-0 flex items-center justify-center" />
                  </div>
                </div>
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={handleDownloadQRCode}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t('links.downloadQRCode')}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('links.name')}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={t('links.enterName')}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('links.tags')}
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
                + {t('links.createTag')}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('links.title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={t('links.enterTitle')}
                maxLength={120}
              />
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">{title.length}/120</div>
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('links.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={t('links.enterDescription')}
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
                  {t('links.previewImage')}
                </label>
                <div className="relative w-full h-48 border dark:border-gray-600 rounded-md overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={t('links.urlPreview')}
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

            <div className="flex justify-between space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <div className="flex space-x-4">
                <button
                  type="reset"
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  {t('common.reset')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? t('common.creating') : t('common.create')}
                </button>
              </div>
            </div>
          </form>
        </div>
        {isCreateTagModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('links.createTag')}</h3>
                <button onClick={() => setIsCreateTagModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('links.tagName')}
                  </label>
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                    className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder={t('links.enterTagName')}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreateTagModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedTeamId) return;
                      
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
                            team_id: selectedTeamId,
                            is_shared: true,
                            schema_version: 1,
                            is_system: false
                          })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to create tag');
                        }

                        // Refresh tags list
                        const tagsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tags?teamId=${selectedTeamId}`, {
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
                    {t('common.create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isQRModalOpen && (
          <QRCodeEditor
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            qrCodeOptions={qrCodeOptions}
            onOptionsChange={(newOptions) => {
              setQrCodeOptions(newOptions);
              if (qrCode.current) {
                qrCode.current.update(newOptions);
              }
            }}
            url={shortUrl}
          />
        )}
      </div>
    </>
  );
}
