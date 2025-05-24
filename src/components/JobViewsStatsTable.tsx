
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, MousePointer } from "lucide-react";
import { useJobViewStats } from "@/hooks/useJobViewStats";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface JobViewsStatsTableProps {
  jobId: string;
  jobTitle: string;
}

const JobViewsStatsTable = ({ jobId, jobTitle }: JobViewsStatsTableProps) => {
  const { stats, isLoading, error } = useJobViewStats(jobId);
  const { features } = useSubscriptionStatus();

  // Only show for Standard or Premium plans
  if (!features.hasJobViewStats && !features.hasAdvancedStats) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visningsstatistik</CardTitle>
          <CardDescription>Laddar statistik för {jobTitle}...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 rounded-full border-2 border-t-primary border-primary/30 animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visningsstatistik</CardTitle>
          <CardDescription>Kunde inte ladda statistik för {jobTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visningsstatistik</CardTitle>
        <CardDescription>Visar hur många som sett {jobTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Typ av visning</TableHead>
              <TableHead>Antal</TableHead>
              <TableHead className="text-right">Beskrivning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Eye size={16} className="text-blue-500" />
                Visningar i lista
              </TableCell>
              <TableCell className="font-medium">{stats.impressions}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                Antal som scrollat förbi annonsen
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <MousePointer size={16} className="text-green-500" />
                Klick för mer info
              </TableCell>
              <TableCell className="font-medium">{stats.detailViews}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                Antal som klickat "Visa mer"
              </TableCell>
            </TableRow>
            <TableRow className="font-semibold">
              <TableCell>Totalt</TableCell>
              <TableCell>{stats.totalViews}</TableCell>
              <TableCell className="text-right">Alla visningar</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default JobViewsStatsTable;
