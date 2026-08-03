import React from 'react';
import { Link } from 'wouter';
import { 
  useGetProjectStats, 
  useGetRecentProjects, 
  useListChannels 
} from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, PlaySquare, Plus, Activity, Clock, CheckCircle2, Tv2 } from 'lucide-react';
import { SiTiktok, SiYoutube, SiInstagram } from 'react-icons/si';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetProjectStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentProjects();
  const { data: channels, isLoading: channelsLoading } = useListChannels();

  const getPlatformIcon = (platform: string | null | undefined) => {
    switch(platform) {
      case 'tiktok': return <SiTiktok className="w-4 h-4" />;
      case 'youtube_shorts': return <SiYoutube className="w-4 h-4 text-red-500" />;
      case 'instagram_reels': return <SiInstagram className="w-4 h-4 text-pink-500" />;
      case 'youtube_long': return <SiYoutube className="w-4 h-4 text-red-500" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Studio Overview</h1>
          <p className="text-muted-foreground font-mono text-sm">Welcome back. Here's your production status.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" className="font-mono text-xs uppercase tracking-wider">
            <Link href="/projects/new">
              <PlaySquare className="w-4 h-4 mr-2" /> Quick Rebuild
            </Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase tracking-wider">
            <Link href="/projects/new">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card/50 border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">Total Projects</CardTitle>
            <Film className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold font-mono">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">Completed This Week</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold font-mono text-primary">{stats?.completedThisWeek || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">Active Channels</CardTitle>
            <Tv2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {channelsLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-3xl font-bold font-mono">{channels?.length || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Projects
            </h2>
            <Button asChild variant="link" className="text-muted-foreground hover:text-primary">
              <Link href="/projects">View all</Link>
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentLoading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : recent?.length === 0 ? (
              <Card className="bg-card/20 border-dashed border-border/50">
                <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                  <Film className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-mono text-sm">No projects yet. Time to create.</p>
                </CardContent>
              </Card>
            ) : (
              recent?.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-card/40 hover:bg-card/60 border-border/40 group overflow-hidden">
                    <div className="flex items-center p-4 gap-4">
                      <div className="w-24 h-16 bg-muted rounded-md flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                        {project.videoUrl || project.outputVideoUrl ? (
                          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${project.outputVideoUrl || project.videoUrl})` }} />
                        ) : null}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        <PlaySquare className="w-6 h-6 text-white/70 relative z-10" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                          {project.mode === 'ai_rebuild' ? (
                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-primary/30 text-primary bg-primary/5">Rebuild</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">Sync</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {project.status}
                          </span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                          {project.channelName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{project.channelName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {getPlatformIcon(project.platform)}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Tv2 className="w-5 h-5 text-muted-foreground" />
              Channels
            </h2>
          </div>
          
          <div className="space-y-4">
            {channelsLoading ? (
               [1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
            ) : channels?.length === 0 ? (
              <Card className="bg-card/20 border-dashed border-border/50">
                <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-muted-foreground font-mono text-sm mb-4">No channels defined.</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/channels/new">Create Channel</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              channels?.slice(0, 4).map(channel => (
                <Link key={channel.id} href={`/channels`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-card/40 border-border/40">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        {channel.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                      </div>
                      <CardDescription className="text-xs truncate">{channel.niche}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs font-mono text-muted-foreground">
                          {channel.projectCount || 0} projects
                        </div>
                        <div className="flex items-center gap-1">
                           {/* Decorative color dots */}
                           {channel.colorPalette?.split(',').slice(0,3).map((c, i) => (
                             <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c.trim() || 'hsl(var(--primary))' }} />
                           ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
