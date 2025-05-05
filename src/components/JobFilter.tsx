
import { useState, KeyboardEvent } from "react";
import type { JobFilter as JobFilterType, JobType } from "@/types"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface JobFilterProps {
  onFilterChange: (filter: JobFilterType) => void;
  initialFilter?: JobFilterType;
}

const JobFilter = ({ onFilterChange, initialFilter }: JobFilterProps) => {
  const [filter, setFilter] = useState<JobFilterType>(initialFilter || {});
  const [searchTerm, setSearchTerm] = useState(initialFilter?.search || "");
  const [location, setLocation] = useState(initialFilter?.location || "");
  const [jobTypes, setJobTypes] = useState<JobType[]>(initialFilter?.jobType || []);
  const [educationRequired, setEducationRequired] = useState<boolean | null>(
    initialFilter?.educationRequired !== undefined ? initialFilter.educationRequired : null
  );
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'relevant'>(
    initialFilter?.sortBy || 'newest'
  );
  
  const [showFilters, setShowFilters] = useState(false);

  const handleJobTypeToggle = (type: JobType) => {
    setJobTypes(prevTypes => {
      if (prevTypes.includes(type)) {
        return prevTypes.filter(t => t !== type);
      } else {
        return [...prevTypes, type];
      }
    });
  };

  const handleEducationToggle = (value: boolean) => {
    setEducationRequired(prev => (prev === value ? null : value));
  };

  const applyFilters = () => {
    const newFilter: JobFilterType = {
      search: searchTerm || undefined,
      location: location || undefined,
      jobType: jobTypes.length > 0 ? jobTypes : undefined,
      educationRequired: educationRequired !== null ? educationRequired : undefined,
      sortBy
    };
    
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setLocation("");
    setJobTypes([]);
    setEducationRequired(null);
    setSortBy('newest');
    
    const emptyFilter: JobFilterType = { sortBy: 'newest' };
    setFilter(emptyFilter);
    onFilterChange(emptyFilter);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyFilters();
    }
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Sök jobbtitel eller beskrivning..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowFilters(!showFilters)} variant="outline" type="button">
          <Filter size={18} className="mr-2" />
          Filter
        </Button>
        <Button onClick={applyFilters} type="button">
          Sök
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Anställningstyp</Label>
            <div className="space-y-2">
              {[
                { id: 'jobtype-fulltime', value: 'fulltime', label: 'Heltid' },
                { id: 'jobtype-parttime', value: 'parttime', label: 'Deltid' },
                { id: 'jobtype-internship', value: 'internship', label: 'Praktik' },
                { id: 'jobtype-freelance', value: 'freelance', label: 'Freelance' }
              ].map((jobType) => (
                <div key={jobType.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={jobType.id} 
                    checked={jobTypes.includes(jobType.value as JobType)}
                    onCheckedChange={() => handleJobTypeToggle(jobType.value as JobType)}
                  />
                  <label htmlFor={jobType.id} className="text-sm cursor-pointer">{jobType.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Utbildningskrav</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="education-yes" 
                  checked={educationRequired === true}
                  onCheckedChange={() => handleEducationToggle(true)}
                />
                <label htmlFor="education-yes" className="text-sm cursor-pointer">Ja</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="education-no" 
                  checked={educationRequired === false}
                  onCheckedChange={() => handleEducationToggle(false)}
                />
                <label htmlFor="education-no" className="text-sm cursor-pointer">Nej</label>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="location">Plats</Label>
              <Input
                id="location"
                placeholder="T.ex. Stockholm, Distansarbete"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-by">Sortera efter</Label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as 'newest' | 'oldest' | 'relevant')}
            >
              <SelectTrigger id="sort-by">
                <SelectValue placeholder="Välj sortering" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nyaste först</SelectItem>
                <SelectItem value="oldest">Äldsta först</SelectItem>
                <SelectItem value="relevant">Mest relevanta</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={resetFilters} 
              variant="outline" 
              className="mt-4 w-full flex items-center justify-center"
              type="button"
            >
              <X size={16} className="mr-2" />
              Återställ filter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFilter;
