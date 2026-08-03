import React from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateChannel } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, "Channel name is required"),
  niche: z.string().min(1, "Niche is required"),
  style: z.string().min(1, "Style is required"),
  description: z.string().optional(),
  toneKeywords: z.string().optional(),
  visualStyle: z.string().optional(),
  colorPalette: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewChannel() {
  const [, setLocation] = useLocation();
  const createChannel = useCreateChannel();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      niche: '',
      style: '',
      description: '',
      toneKeywords: '',
      visualStyle: '',
      colorPalette: '#000000, #ffffff, #6366f1',
    }
  });

  const onSubmit = (data: FormValues) => {
    createChannel.mutate({ data }, {
      onSuccess: () => {
        setLocation('/channels');
      }
    });
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full">
      <Button variant="ghost" asChild className="mb-6 -ml-4 text-muted-foreground">
        <Link href="/channels">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Channels
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Channel</h1>
        <p className="text-muted-foreground font-mono text-sm">Define a new brand identity for your videos.</p>
      </div>

      <Card className="bg-card/50 border-border/50 backdrop-blur">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Channel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tymotive" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Niche</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Motivation & Growth" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Editing Style</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fast-paced cinematic" className="bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the channel's goal and target audience." 
                          className="bg-background/50 resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 mt-4 mb-2">
                  <h3 className="text-lg font-medium border-b border-border/50 pb-2">AI Generation Guidelines</h3>
                </div>

                <FormField
                  control={form.control}
                  name="toneKeywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone Keywords</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., intense, inspiring, authoritative" className="bg-background/50 font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated keywords guiding AI script generation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visualStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visual Style Prompts</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., moody, high contrast, cyberpunk" className="bg-background/50 font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Applied to AI image generation prompts.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colorPalette"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Color Palette (Hex Codes)</FormLabel>
                      <FormControl>
                        <Input placeholder="#000000, #ffffff, #ff0000" className="bg-background/50 font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Used for caption highlighting and UI accents.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border/50">
                <Button 
                  type="submit" 
                  disabled={createChannel.isPending}
                  className="bg-primary hover:bg-primary/90 font-mono uppercase tracking-wider text-xs px-8"
                >
                  {createChannel.isPending ? 'Saving...' : (
                    <><Save className="w-4 h-4 mr-2" /> Save Channel</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
