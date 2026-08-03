import React, { useState } from 'react';
import { Link } from 'wouter';
import { useListProjects } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Film, PlaySquare, Plus, Search, Activity, MoreVertical, Trash2, Tv2 } from 'lucide-react';
import { SiTiktok, SiYoutube, SiInstagram } from 'react-icons/si';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Projects() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  
  // Note: ListProjectsParams doesn't natively accept 'all' but we filter locally or map to null
  const apiStatus = statusFilter === 'all' ? null : statusFilter;
  const apiMode = modeFilter === 'all' ? null : modeFilter;
  
  const { data: projects, isLoading } = useListProjects({ 
    status: apiStatus, 
    mode: apiMode 
  });

  const getPlatformIcon = (platform: string | null | undefined) => {
    switch(platform) {
      case 'tiktok': return <SiTiktok className="w-4 h-4" />;
      case 'youtube_shorts': return <SiYoutube className="w-4 h-4 text-red-500" />;
      case 'instagram_reels': return <SiInstagram className="w-4 h-4 text-pink-500" />;
      case 'youtube_long': return <SiYoutube className="w-4 h-4 text-red-500" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'complete': return 'border-green-500/50 text-green-500 bg-green-500/10';
      case 'error': return 'border-destructive/50 text-destructive bg-destructive/10';
      case 'draft': return 'border-muted-foreground/30 text-muted-foreground bg-muted/10';
      default: return 'border-primary/50 text-primary bg-primary/10';
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
          <p className="text-muted-foreground font-mono text-sm">Manage your video production pipeline.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-card/30 p-4 rounded-xl border border-border/50 backdrop-blur">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-9 bg-background/50 border-border/50 font-mono text-sm"
          />
        </div>
        <div className="flex gap-4 sm:w-auto w-full">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background/50 border-border/50 font-mono text-xs uppercase tracking-wider">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="analyzing">Analyzing</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="rendering">Rendering</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-[140px] bg-background/50 border-border/50 font-mono text-xs uppercase tracking-wider">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="original_sync">Original Sync</SelectItem>
              <SelectItem value="ai_rebuild">AI Rebuild</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-[280px] w-full rounded-xl" />)}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/10">
          <Film className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {statusFilter !== 'all' || modeFilter !== 'all' 
              ? "No projects match your current filters."
              : "You haven't created any projects yet. Start by creating your first video project."}
          </p>
          {statusFilter === 'all' && modeFilter === 'all' ? (
            <Button asChild>
              <Link href="/projects/new">Create Project</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { setStatusFilter('all'); setModeFilter('all'); }}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects?.map(project => (
            <Card key={project.id} className="group flex flex-col overflow-hidden bg-card/40 border-border/40 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
              <Link href={`/projects/${project.id}`} className="block relative aspect-video bg-muted border-b border-border overflow-hidden">
                {project.videoUrl || project.outputVideoUrl ? (
                   <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${project.outputVideoUrl || project.videoUrl})` }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlaySquare className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge variant="outline" className={`text-[10px] uppercase font-mono tracking-wider backdrop-blur-md ${getStatusColor(project.status)}`}>
                    {project.status}
                  </Badge>
                </div>
                
                <div className="absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white/90">
                  {getPlatformIcon(project.platform)}
                </div>
              </Link>
              
              <CardContent className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link href={`/projects/${project.id}`} className="font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">
                      {project.title}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {project.channelName && (
                    <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                      <Tv2 className="w-3 h-3" />
                      <span className="truncate">{project.channelName}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs font-mono text-muted-foreground">
                  <span>{project.mode === 'ai_rebuild' ? 'Rebuild' : 'Sync'}</span>
                  <span>{format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
