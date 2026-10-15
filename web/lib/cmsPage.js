import { cache } from 'react';
import { notFound } from 'next/navigation';
import { contentService } from '@/services';

/** Cached loaders so generateMetadata() and the page share one request; API 404/403 become Next.js not-found. */
const guard = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
};

export const loadPage = cache((slug) => guard(() => contentService.getPage(slug)));
export const loadPost = cache((slug) => guard(() => contentService.getPost(slug)));
