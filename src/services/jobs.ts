
// This file is kept for backward compatibility
// Import and re-export the jobs API service as the main jobs service
import { jobsServiceApi } from './jobs/jobs-api';

// Export the API implementation to be used throughout the app
export const jobsService = jobsServiceApi;
