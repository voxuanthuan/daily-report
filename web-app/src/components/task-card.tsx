import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JiraIssue } from "@/types/jira";
import { Clock, ExternalLink } from "lucide-react";

interface TaskCardProps {
  issue: JiraIssue;
}

export function TaskCard({ issue }: TaskCardProps) {
  // Determine status color (basic mapping)
  const statusColor =
    issue.fields.status.statusCategory?.colorName === "blue-gray"
      ? "secondary" // To Do
      : issue.fields.status.statusCategory?.colorName === "yellow"
      ? "default" // In Progress
      : issue.fields.status.statusCategory?.colorName === "green"
      ? "outline" // Done
      : "secondary";

  return (
    <Card className="w-full mb-4 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">
            {issue.key}
            </CardTitle>
            <Badge variant={statusColor as any}>{issue.fields.status.name}</Badge>
        </div>
        {issue.fields.priority && (
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {issue.fields.priority.name}
            </span>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <p className="font-medium leading-snug">{issue.fields.summary}</p>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
            <a href={`${process.env.NEXT_PUBLIC_JIRA_HOST || ''}/browse/${issue.key}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                Open
            </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
