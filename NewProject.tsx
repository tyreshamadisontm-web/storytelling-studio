import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateProject, useListChannels } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Mic2, ArrowRight, ArrowLeft, Smartphone, Monitor, ChevronRight } from 'lucide-react';
import { SiTiktok, SiYoutube, SiInstagram } from 'react-icons/si';

const formSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  channelId: z.coerce.number().optional().nullable(),
  format: z.enum(['vertical_9_16', 'horizontal_16_9']),
  platform: z.enum(['tiktok', 'youtube_shorts', 'instagram_reels', 'youtube_long']).optional(),
  audioUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast(); // wait, does useToast work like this in this project? Let's check `components/ui/toast` vs `hooks/use-toast`
  // Actually, instructions say: The `useToast` hook is exported from `@/hooks/use-toast`.
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMode, setSelectedMode] = useState<'original_sync' | 'ai_rebuild' | null>(null);
  
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const createProject = useCreateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      format: 'vertical_9_16',
      platform: 'tiktok',
      audioUrl: '',
      videoUrl: '',
    }
  });

  const onSubmit = (data: FormValues) => {
    if (!selectedMode) return;
    
    createProject.mutate({
      data: {
        title: data.title,
        mode: selectedMode,
        format: data.format,
        platform: data.platform,
        channelId: data.channelId ? Number(data.channelId) : undefined,
        audioUrl: data.audioUrl || undefined,
        videoUrl: data.videoUrl || undefined,
      }
    }, {
      onSuccess: (project) => {
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        // use toast if available, otherwise just log
        console.error("Failed to create project");
      }
    });
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">New Project</h1>
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
          <span className={step === 1 ? "text-primary" : ""}>01 / Mode Selection</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step === 2 ? "text-primary" : ""}>02 / Project Details</span>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all duration-300 relative overflow-hidden group border-2 ${selectedMode === 'ai_rebuild' ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-primary/50'}`}
              onClick={() => setSelectedMode('ai_rebuild')}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wand2 className="w-32 h-32" />
              </div>
              <CardHeader className="relative z-10">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <Wand2 className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">AI Message Rebuild</CardTitle>
                <CardDescription className="text-base mt-2">
                  Perfect for rough voice memos. Upload raw thoughts, and our AI will restructure it into a compelling hook, story, and conclusion with optimized visuals.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <ul className="space-y-2 mt-4 font-mono text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-primary" /> Auto-scripting & pacing</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-primary" /> Generated high-retention hooks</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-primary" /> Dynamic visual planning</li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-300 relative overflow-hidden group border-2 ${selectedMode === 'original_sync' ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-primary/50'}`}
              onClick={() => setSelectedMode('original_sync')}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Mic2 className="w-32 h-32" />
              </div>
              <CardHeader className="relative z-10">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 text-muted-foreground">
                  <Mic2 className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Original Audio Sync</CardTitle>
                <CardDescription className="text-base mt-2">
                  Perfect for polished recordings or existing videos. We'll keep your audio exactly as-is and generate cinematic B-roll and captions perfectly synced.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <ul className="space-y-2 mt-4 font-mono text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Exact timing preservation</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Beat-matched transitions</li>
                  <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Professional captioning</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              size="lg" 
              onClick={() => setStep(2)} 
              disabled={!selectedMode}
              className="bg-primary hover:bg-primary/90 font-mono uppercase tracking-wider text-xs px-8"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <Button variant="ghost" className="mb-6 -ml-4 text-muted-foreground" onClick={() => setStep(1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <Card className="bg-card/50 border-border/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Configure the technical specifications for your {selectedMode === 'ai_rebuild' ? 'AI Rebuild' : 'Original Sync'} project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., The Psychology of Discipline" className="bg-background/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="channelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Channel (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select a channel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {channels?.map(channel => (
                                <SelectItem key={channel.id} value={channel.id.toString()}>
                                  {channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Link this to a specific brand identity.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Platform</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tiktok"><div className="flex items-center"><SiTiktok className="w-4 h-4 mr-2"/> TikTok</div></SelectItem>
                              <SelectItem value="youtube_shorts"><div className="flex items-center"><SiYoutube className="w-4 h-4 mr-2"/> YT Shorts</div></SelectItem>
                              <SelectItem value="instagram_reels"><div className="flex items-center"><SiInstagram className="w-4 h-4 mr-2"/> Reels</div></SelectItem>
                              <SelectItem value="youtube_long"><div className="flex items-center"><SiYoutube className="w-4 h-4 mr-2"/> YT Long</div></SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Aspect Ratio</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="vertical_9_16" className="peer sr-only" />
                              </FormControl>
                              <Label className="flex flex-col items-center justify-between rounded-md border-2 border-border/50 bg-background/50 p-4 hover:bg-card hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all">
                                <Smartphone className="mb-3 h-6 w-6" />
                                <span className="text-sm font-medium uppercase tracking-wider">Vertical (9:16)</span>
                              </Label>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="horizontal_16_9" className="peer sr-only" />
                              </FormControl>
                              <Label className="flex flex-col items-center justify-between rounded-md border-2 border-border/50 bg-background/50 p-4 hover:bg-card hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all">
                                <Monitor className="mb-3 h-6 w-6" />
                                <span className="text-sm font-medium uppercase tracking-wider">Horizontal (16:9)</span>
                              </Label>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h3 className="text-lg font-medium">Source Media</h3>
                    <FormField
                      control={form.control}
                      name="audioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audio Source URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." className="bg-background/50 font-mono text-sm" {...field} />
                          </FormControl>
                          <FormDescription>Direct link to MP3/WAV file or cloud storage.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="bg-primary hover:bg-primary/90 font-mono uppercase tracking-wider text-xs px-8"
                      disabled={createProject.isPending}
                    >
                      {createProject.isPending ? 'Creating...' : 'Create Studio Project'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
