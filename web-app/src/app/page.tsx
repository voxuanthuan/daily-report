"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCheck, Clock, Copy, FileText, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function Home() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["report", date],
    queryFn: async () => {
      // Use the new Standup API
      const res = await fetch(`/api/jira/standup?date=${date}`);
      if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            throw new Error(json.error || text);
        } catch {
            throw new Error(text);
        }
      }
      return res.json();
    },
    retry: 1,
  });

  const generateMarkdown = () => {
    if (!data) return "";
    
    let md = `Hi everyone,\n`;
    
    // Yesterday Section
    const yesterdayDate = data.yesterday?.date ? new Date(data.yesterday.date) : null;
    let label = "Yesterday";
    if (yesterdayDate) {
         const day = yesterdayDate.toLocaleDateString('en-US', { weekday: 'long' });
         // If > 2 days ago (e.g. Friday and today is Monday), say "Last Friday"
         const diffTime = new Date(date).getTime() - yesterdayDate.getTime();
         const diffDays = diffTime / (1000 * 3600 * 24);
         if (diffDays > 2) {
             label = `Last ${day}`;
         } else if (diffDays > 1) { // e.g. yesterday was Sunday
             label = `Yesterday (${day})`;
         }
    }

    md += `${label}\n`;

    if (data.yesterday?.tasks && data.yesterday.tasks.length > 0) {
        data.yesterday.tasks.forEach((t: any) => {
            md += `• ${t.key}: ${t.summary}\n`;
        });
    } else {
        md += `• No worklogs found.\n`;
    }

    // Today Section
    md += `Today\n`;
    if (data.today?.tasks && data.today.tasks.length > 0) {
        data.today.tasks.forEach((t: any) => {
            md += `• ${t.key}: ${t.summary}\n`;
        });
    } else {
        md += `• No tasks planned.\n`;
    }

    md += `No blockers`;

    return md;
  };

  const markdown = generateMarkdown();

  const handleCopy = async () => {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(markdown);
        } else {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = markdown;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                throw err;
            }
            document.body.removeChild(textArea);
        }
        setCopied(true);
        toast.success("Report copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        toast.error("Failed to copy report");
        console.error("Copy failed", err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* Back button removed as this is now Home */}
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Daily Report</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Generate markdown for your standup</p>
                </div>
            </div>
            {/* Optional: User profile or settings could go here */}
        </div>

        <div className="grid gap-6">
            {/* Control Card */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="h-4 w-4" />
                        Select Date
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex gap-3">
                        <Input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full font-mono text-sm max-w-[200px]" 
                        />
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            onClick={() => refetch()} 
                            disabled={isLoading || isRefetching}
                            className="shrink-0"
                            title="Refresh Data"
                        >
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isRefetching) && "animate-spin")} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Content Area */}
            {(isLoading && !data) ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Fetching worklogs...</p>
                </div>
            ) : isError ? (
                 <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg text-sm flex gap-3 text-red-600 dark:text-red-400">
                    <div className="shrink-0 pt-0.5">⚠️</div>
                    <div>
                        <p className="font-semibold">Failed to load report</p>
                        <p className="opacity-90">{(error as Error).message}</p>
                    </div>
                 </div>
            ) : (!data?.yesterday?.tasks?.length && !data?.today?.tasks?.length) ? (
                <EmptyState 
                    icon={FileText} 
                    title="No data found" 
                    description={`Could not find recent worklogs or in-progress tasks for ${date}.`} 
                />
            ) : (
                <Card className="shadow-md border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Markdown Preview
                            </CardTitle>
                        </div>
                        <Button 
                            variant={copied ? "default" : "outline"} 
                            size="sm" 
                            onClick={handleCopy}
                            className={cn(
                                "transition-all duration-200", 
                                copied ? "bg-green-600 hover:bg-green-700 text-white border-transparent" : ""
                            )}
                        >
                            {copied ? (
                                <>
                                    <CheckCheck className="mr-2 h-3.5 w-3.5" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-2 h-3.5 w-3.5" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative group">
                            <pre className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 overflow-auto whitespace-pre-wrap min-h-[300px] max-h-[600px]">
                                {markdown}
                            </pre>
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                        </div>
                    </CardContent>
                    <CardFooter className="py-2 px-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
                        <span>Generated from Jira API</span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date().toLocaleTimeString()}
                        </span>
                    </CardFooter>
                </Card>
            )}
        </div>
      </div>
    </main>
  );
}
