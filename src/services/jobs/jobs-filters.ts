import { Job, JobFilter } from "@/types";
import { authService } from "../auth";

class JobsFilters {
  applyFilters(jobs: Job[], filter: JobFilter): Job[] {
    const currentUser = authService.getCurrentUser();
    let filteredJobs = [...jobs];
    
    // If user is not an admin, only show approved jobs to the public
    if (!currentUser || (currentUser.role !== 'admin' && filter.status !== 'pending')) {
      filteredJobs = filteredJobs.filter(job => job.status === 'approved');
    }
    
    // If user is a company, only show their own jobs when looking at pending jobs
    if (currentUser && currentUser.role === 'company' && filter.status === 'pending') {
      filteredJobs = filteredJobs.filter(job => job.companyId === currentUser.id);
    }

    // Apply status filter if specified
    if (filter.status) {
      filteredJobs = filteredJobs.filter(job => job.status === filter.status);
    }

    // Apply search filter
    if (filter.search) {
      filteredJobs = this.applySearchFilter(filteredJobs, filter.search);
    }

    // Apply job type filter
    if (filter.jobType && filter.jobType.length > 0) {
      filteredJobs = filteredJobs.filter(job => filter.jobType?.includes(job.jobType));
    }

    // Apply education requirement filter
    if (filter.educationRequired !== null && filter.educationRequired !== undefined) {
      filteredJobs = filteredJobs.filter(job => job.educationRequired === filter.educationRequired);
    }

    // Apply location filter
    if (filter.location) {
      filteredJobs = this.applyLocationFilter(filteredJobs, filter.location);
    }

    // Apply sorting
    if (filter.sortBy) {
      filteredJobs = this.applySorting(filteredJobs, filter.sortBy);
    }

    return filteredJobs;
  }

  private applySearchFilter(jobs: Job[], search: string): Job[] {
    const searchTerm = search.toLowerCase();
    return jobs.filter(
      job =>
        job.title.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
    );
  }

  private applyLocationFilter(jobs: Job[], location: string): Job[] {
    const locationTerm = location.toLowerCase();
    return jobs.filter(job => job.location.toLowerCase().includes(locationTerm));
  }

  private applySorting(jobs: Job[], sortBy: string): Job[] {
    const sortedJobs = [...jobs];
    switch (sortBy) {
      case 'newest':
        sortedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sortedJobs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'relevant':
        // In a real app, this would implement relevance sorting logic
        // For now, we'll just keep the default order
        break;
    }
    return sortedJobs;
  }
}

export const jobsFilters = new JobsFilters();
