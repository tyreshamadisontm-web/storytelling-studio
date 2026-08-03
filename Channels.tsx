import React from 'react';
import { Link } from 'wouter';
import { useListChannels, useDeleteChannel } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tv2, Plus, MoreVertical, Trash2, Edit2, Film, Hash, Palette } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Channels() {
  const { data: channels, isLoading } = useListChannels();
  const deleteChannel = useDeleteChannel();

  const handleDelete = (id: number) => {
    if(confirm('Are you sure you want to delete this channel?')) {
      deleteChannel.mutate({ channelId: id });
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Brand Channels</h1>
          <p className="text-muted-foreground font-mono text-sm">Manage identities, tones, and visual styles for your content.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 font-mono text-xs uppercase tracking-wider">
          <Link href="/channels/new">
            <Plus className="w-4 h-4 mr-2" /> Add Channel
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : channels?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/10">
          <Tv2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No channels defined</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Create your first channel to set default styles, tones, and organization for your videos.
          </p>
          <Button asChild>
            <Link href="/channels/new">Create Channel</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels?.map(channel => (
            <Card key={channel.id} className="bg-card/40 border-border/50 hover:border-primary/40 transition-colors flex flex-col overflow-hidden relative">
              {channel.isDefault && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold font-mono px-3 py-1 uppercase tracking-wider rounded-bl-lg z-10">
                  Default
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <Tv2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{channel.name}</CardTitle>
                      <CardDescription className="text-xs font-mono uppercase tracking-wider mt-1 text-primary/80">
                        {channel.niche}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 -mr-2 -mt-2">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={() => handleDelete(channel.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {channel.description || "No description provided."}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1 font-mono uppercase text-[10px] tracking-wider">
                      <Film className="w-3 h-3" /> Visual Style
                    </div>
                    <p className="font-medium truncate">{channel.visualStyle || "Default"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1 font-mono uppercase text-[10px] tracking-wider">
                      <Hash className="w-3 h-3" /> Tone
                    </div>
                    <p className="font-medium truncate">{channel.toneKeywords || "Default"}</p>
                  </div>
                </div>

                {channel.colorPalette && (
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-2 font-mono uppercase text-[10px] tracking-wider">
                      <Palette className="w-3 h-3" /> Brand Colors
                    </div>
                    <div className="flex gap-2">
                      {channel.colorPalette.split(',').map((color, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-full border border-border shadow-sm" 
                          style={{ backgroundColor: color.trim() }}
                          title={color.trim()}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>{channel.projectCount || 0} projects</span>
                <span>Created {format(new Date(channel.createdAt), 'MMM yyyy')}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
