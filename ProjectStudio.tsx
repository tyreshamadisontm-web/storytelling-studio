import React, { useState, useRef } from 'react';
import { useRoute } from 'wouter';
import { 
  useGetProject, 
  useGetPipelineStatus, 
  useListScenes, 
  useListCaptions,
  useAnalyzeAudio,
  usePlanScenes,
  useRebuildScript,
  useGenerateVisuals,
  useGenerateCaptions,
  getListScenesQueryKey,
  getListCaptionsQueryKey,
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, PlaySquare, Settings2, Image as ImageIcon, 
  Type, Wand2, Mic2, AlertCircle, CheckCircle2, Clock, 
  Edit3, Loader2, ArrowRight, Download, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export default function ProjectStudio() {
  const [, params] = useRoute('/projects/:id');
  const projectId = Number(params?.id);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('pipeline');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, { 
    query: { enabled: !!projectId } 
  });
  
  const { data: pipeline, isLoading: pipelineLoading } = useGetPipelineStatus(projectId, { 
    query: { enabled: !!projectId, refetchInterval: project?.status === 'analyzing' || project?.status === 'planning' || project?.status === 'generating' || project?.status === 'rendering' ? 2000 : false } 
  });
  
  const { data: scenes, isLoading: scenesLoading } = useListScenes(projectId, { 
    query: { enabled: !!projectId } 
  });
  
  const { data: captions, isLoading: captionsLoading } = useListCaptions(projectId, { 
    query: { enabled: !!projectId } 
  });

  const analyzeAudio = useAnalyzeAudio();
  const rebuildScript = useRebuildScript();
  const planScenes = usePlanScenes();
  const generateVisuals = useGenerateVisuals();
  const generateCaptions = useGenerateCaptions();
  const [isRunningAll, setIsRunningAll] = useState(false);
  // Store the AI-rewritten script so we can show it in the UI
  const [rebuiltScript, setRebuiltScript] = useState<string | null>(null);

  const isAiRebuild = project?.mode === 'ai_rebuild';

  // ── Shared tail: plan → visuals → captions ─────────────────────
  const runTail = (onDone: () => void, onFail: () => void) => {
    planScenes.mutate({ projectId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) });
        generateVisuals.mutate({ projectId }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) });
            generateCaptions.mutate(
              { projectId, data: { style: project?.captionStyle || 'minimal' } },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListCaptionsQueryKey(projectId) });
                  onDone();
                },
                onError: onFail,
              }
            );
          },
          onError: onFail,
        });
      },
      onError: onFail,
    });
  };

  // ── Run the full pipeline in order, then auto-export MP4 ───────
  // Original Sync:  analyze → plan → visuals → captions → export MP4
  // AI Rebuild:     analyze → rewrite → plan → visuals → captions → export MP4
  const runFullPipeline = () => {
    setIsRunningAll(true);
    // After pipeline steps finish, automatically build + download the MP4
    const done = () => {
      setIsRunningAll(false);
      handleVideoExport();
    };
    const fail = () => setIsRunningAll(false);
    analyzeAudio.mutate(
      { projectId, data: { audioUrl: project?.audioUrl || '' } },
      {
        onSuccess: () => {
          if (isAiRebuild) {
            rebuildScript.mutate(
              { projectId, data: { style: project?.emotionalTone || 'motivational' } },
              {
                onSuccess: (data) => {
                  setRebuiltScript(data.newScript || null);
                  runTail(done, fail);
                },
                onError: fail,
              }
            );
          } else {
            runTail(done, fail);
          }
        },
        onError: fail,
      }
    );
  };

  const isPipelineRunning = isRunningAll
    || analyzeAudio.isPending || rebuildScript.isPending
    || planScenes.isPending || generateVisuals.isPending
    || generateCaptions.isPending;

  // ── All exports go through the API server ─────────────────────
  // Uses fetch→blob so the browser saves with the correct .html extension
  // regardless of iframe/proxy context.
  const triggerExport = async (type: 'full' | 'analysis' | 'scenes' | 'captions' | 'audio') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/export?type=${type}`);
      if (!res.ok) { console.error('Export failed', res.status); return; }
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `export-${type}.html`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error', err);
    }
  };

  // Per-scene generate state (Set of sceneIds currently generating)
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
  const [savingAllImages, setSavingAllImages] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);
  const handleExport = async () => {
    await triggerExport('full');
    // Mark export step complete on the server
    await fetch(`/api/projects/${projectId}/pipeline/export-complete`, { method: 'POST' }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'pipeline', 'status'] });
  };

  const handleVideoExport = async () => {
    setVideoExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export/video`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        alert(err.error || 'Video export failed');
        return;
      }
      // Force video/mp4 MIME type so the browser never guesses .txt
      const raw = await res.arrayBuffer();
      const blob = new Blob([raw], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() ?? 'video'}-video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Mark export complete
      await fetch(`/api/projects/${projectId}/pipeline/export-complete`, { method: 'POST' }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'pipeline', 'status'] });
    } finally {
      setVideoExporting(false);
    }
  };
  const exportAnalysis     = () => triggerExport('analysis');
  const exportScenePlan    = () => triggerExport('scenes');
  const exportCaptionsPlan = () => triggerExport('captions');
  const exportAudio        = () => triggerExport('audio');

  // ── Per-scene AI image generation ─────────────────────────────
  const generateSceneImage = async (sceneId: number) => {
    setGeneratingScenes(prev => new Set([...prev, sceneId]));
    try {
      await fetch(`/api/projects/${projectId}/scenes/${sceneId}/generate-image`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) });
    } finally {
      setGeneratingScenes(prev => { const s = new Set(prev); s.delete(sceneId); return s; });
    }
  };

  // ── Per-scene image download — routed through our server to avoid DALL-E CORS ──
  const downloadSceneImage = async (scene: { id: number; order: number; imageUrl?: string | null }) => {
    if (!scene.imageUrl) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}/image`);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene-${scene.order}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Save all images one by one ─────────────────────────────────
  const saveAllImages = async () => {
    if (!scenes) return;
    setSavingAllImages(true);
    try {
      const withImages = scenes.filter(s => s.imageUrl);
      for (const scene of withImages) {
        await downloadSceneImage(scene);
        await new Promise(r => setTimeout(r, 400)); // small gap so browser doesn't block
      }
    } finally {
      setSavingAllImages(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex-1 p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-[500px]" />
          <Skeleton className="col-span-1 h-[500px]" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden w-full">
      {/* Studio Header */}
      <header className="flex-shrink-0 border-b border-border/50 bg-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold tracking-tight">{project.title}</h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-primary/50 text-primary">
              {project.status}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-4">
            <span className="flex items-center gap-1">
              {project.mode === 'ai_rebuild' ? <Wand2 className="w-3 h-3"/> : <Mic2 className="w-3 h-3"/>}
              {project.mode === 'ai_rebuild' ? 'AI Rebuild' : 'Original Sync'}
            </span>
            <span>{project.format}</span>
            <span>{project.duration ? `${project.duration}s` : '--:--'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-wider">
            <Settings2 className="w-4 h-4 mr-2" /> Settings
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 font-mono text-xs uppercase tracking-wider"
            onClick={handleVideoExport}
            disabled={videoExporting || (!scenes?.length && !captions?.length)}
          >
            {videoExporting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…</>
              : <><Download className="w-4 h-4 mr-2" /> Export MP4</>}
          </Button>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 overflow-hidden flex w-full">
        {/* Left Content Area (Tabs) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50 bg-background/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 py-2 border-b border-border/50 bg-card/20">
              <TabsList className="bg-muted/50 border border-border/50">
                <TabsTrigger value="pipeline" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-card">
                  <Activity className="w-3.5 h-3.5 mr-2" /> Pipeline
                </TabsTrigger>
                <TabsTrigger value="storyboard" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-card">
                  <ImageIcon className="w-3.5 h-3.5 mr-2" /> Storyboard
                </TabsTrigger>
                <TabsTrigger value="captions" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-card">
                  <Type className="w-3.5 h-3.5 mr-2" /> Captions
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6">
              
              <TabsContent value="pipeline" className="mt-0 outline-none">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold">Production Pipeline</h2>
                      <p className="text-sm text-muted-foreground">
                        {isAiRebuild
                          ? 'Analyze → Rewrite → Scenes → AI Visuals → Captions → MP4 ↓'
                          : 'Analyze → Scenes → AI Visuals → Captions → MP4 ↓'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {pipeline?.overallProgress !== undefined && (
                        <div className="flex items-center gap-2 w-36">
                          <Progress value={pipeline.overallProgress} className="h-2 flex-1" />
                          <span className="font-mono text-xs font-bold">{Math.round(pipeline.overallProgress)}%</span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/90"
                        onClick={runFullPipeline}
                        disabled={isPipelineRunning || videoExporting}
                      >
                        {videoExporting && !isPipelineRunning
                          ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Building MP4…</>
                          : isPipelineRunning
                          ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Running…</>
                          : <><PlaySquare className="w-3 h-3 mr-2" /> Run All + Export</>}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-border/20">
                    {pipelineLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : pipeline?.steps?.map((step, idx) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                          {step.status === 'complete' ? <CheckCircle2 className="w-5 h-5 text-primary" /> :
                           step.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> :
                           step.status === 'error' ? <AlertCircle className="w-5 h-5 text-destructive" /> :
                           <Clock className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        
                        {/* Content */}
                        <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] transition-colors border-border/50 ${step.status === 'running' ? 'border-primary shadow-lg shadow-primary/5 bg-primary/5' : 'bg-card/40'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-sm">{step.label}</h3>
                              <Badge variant="outline" className={`text-[9px] uppercase font-mono tracking-wider ${
                                step.status === 'complete' ? 'text-green-500 border-green-500/30' :
                                step.status === 'running' ? 'text-primary border-primary/30' :
                                step.status === 'error' ? 'text-destructive border-destructive/30' :
                                'text-muted-foreground border-border'
                              }`}>
                                {step.status}
                              </Badge>
                            </div>
                            {step.message && (
                              <p className="text-xs text-muted-foreground mt-2">{step.message}</p>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="mt-4 flex flex-wrap justify-end gap-2">

                              {/* ── Upload Audio ── */}
                              {step.name === 'upload' && (
                                <>
                                  <input
                                    ref={audioInputRef}
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) setUploadedFileName(file.name);
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs font-mono uppercase tracking-wider"
                                    onClick={() => audioInputRef.current?.click()}
                                  >
                                    <Upload className="w-3 h-3 mr-1" />
                                    {uploadedFileName ?? 'Choose Audio'}
                                  </Button>
                                </>
                              )}

                              {/* ── Analyze complete ── */}
                              {step.status === 'complete' && step.name === 'analyze' && (
                                <Button size="sm" variant="ghost"
                                  className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                  onClick={exportAnalysis}>
                                  <Download className="w-3 h-3 mr-1" /> Export Analysis
                                </Button>
                              )}

                              {/* ── Rebuild Script: running ── */}
                              {step.status === 'running' && step.name === 'rebuild' && (
                                <p className="text-xs text-muted-foreground font-mono animate-pulse">
                                  AI is expanding your message…
                                </p>
                              )}

                              {/* ── Rebuild Script: complete ── */}
                              {step.status === 'complete' && step.name === 'rebuild' && (
                                <div className="w-full space-y-2">
                                  {rebuiltScript && (
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 border-l-2 border-primary/40 pl-2">
                                      {rebuiltScript}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-primary font-mono uppercase tracking-wider">
                                    ✓ New script saved — scenes will use the expanded version
                                  </p>
                                </div>
                              )}

                              {/* ── Plan complete ── */}
                              {step.status === 'complete' && step.name === 'plan' && (
                                <>
                                  <Button size="sm" variant="ghost"
                                    className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                    onClick={() => setActiveTab('storyboard')}>
                                    <ImageIcon className="w-3 h-3 mr-1" /> View Scenes
                                  </Button>
                                  <Button size="sm" variant="ghost"
                                    className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                    onClick={exportScenePlan} disabled={!scenes?.length}>
                                    <Download className="w-3 h-3 mr-1" /> Export Scenes
                                  </Button>
                                </>
                              )}

                              {/* ── Generate Visuals: running progress ── */}
                              {step.status === 'running' && step.name === 'generate' && (
                                <div className="w-full space-y-1">
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {step.message || `Generating images…`}
                                  </p>
                                  {step.progress !== undefined && (
                                    <Progress value={step.progress} className="h-1" />
                                  )}
                                </div>
                              )}

                              {/* ── Generate Visuals: complete ── */}
                              {step.status === 'complete' && step.name === 'generate' && (
                                <div className="w-full space-y-2">
                                  {/* Image strip */}
                                  {scenes?.some(s => s.imageUrl) && (
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                      {scenes.filter(s => s.imageUrl).slice(0, 6).map(s => (
                                        <img
                                          key={s.id}
                                          src={s.imageUrl!}
                                          alt={`Scene ${s.order}`}
                                          className="h-14 w-8 object-cover rounded flex-shrink-0 border border-border/50"
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <Button size="sm" variant="ghost"
                                    className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                    onClick={() => setActiveTab('storyboard')}>
                                    <ImageIcon className="w-3 h-3 mr-1" /> View Full Storyboard
                                  </Button>
                                </div>
                              )}

                              {/* ── Captions complete ── */}
                              {step.status === 'complete' && step.name === 'captions' && (
                                <>
                                  <Button size="sm" variant="ghost"
                                    className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                    onClick={() => setActiveTab('captions')}>
                                    <Type className="w-3 h-3 mr-1" /> View Captions
                                  </Button>
                                  <Button size="sm" variant="ghost"
                                    className="h-7 text-xs font-mono uppercase tracking-wider text-primary"
                                    onClick={exportCaptionsPlan} disabled={!captions?.length}>
                                    <Download className="w-3 h-3 mr-1" /> Export Captions
                                  </Button>
                                </>
                              )}

                              {/* ── Export Package step ── */}
                              {step.name === 'export' && (
                                <div className="w-full">
                                  {(captions?.length || scenes?.length) ? (
                                    <div className="flex flex-wrap gap-2 justify-end">
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs font-mono uppercase tracking-wider bg-primary hover:bg-primary/90"
                                        onClick={handleVideoExport}
                                        disabled={videoExporting}
                                      >
                                        {videoExporting
                                          ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Building MP4…</>
                                          : <><Download className="w-3 h-3 mr-1" /> Download MP4</>}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs font-mono uppercase tracking-wider text-primary"
                                        onClick={handleExport}
                                      >
                                        <Download className="w-3 h-3 mr-1" /> Full Brief (.html)
                                      </Button>
                                      {project?.audioUrl && (
                                        <Button size="sm" variant="ghost"
                                          className="h-8 text-xs font-mono uppercase tracking-wider text-muted-foreground"
                                          onClick={exportAudio}>
                                          <Download className="w-3 h-3 mr-1" /> Audio
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-right">
                                      Run the pipeline first to unlock export.
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* ── Start / Retry individual steps ── */}
                              {(step.status === 'pending' || step.status === 'error') && step.name !== 'export' && step.name !== 'upload' && (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs font-mono uppercase tracking-wider"
                                  disabled={isPipelineRunning}
                                  onClick={() => {
                                    if (step.name === 'analyze') analyzeAudio.mutate({ projectId, data: { audioUrl: project?.audioUrl || '' } });
                                    if (step.name === 'rebuild') rebuildScript.mutate({ projectId, data: { style: project?.emotionalTone || 'motivational' } }, { onSuccess: (d) => setRebuiltScript(d.newScript || null) });
                                    if (step.name === 'plan') planScenes.mutate({ projectId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) }) });
                                    if (step.name === 'generate') generateVisuals.mutate({ projectId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) }) });
                                    if (step.name === 'captions') generateCaptions.mutate({ projectId, data: { style: project?.captionStyle || 'minimal' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCaptionsQueryKey(projectId) }) });
                                  }}>
                                  {step.status === 'error' ? 'Retry' : 'Start'} <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}

                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="storyboard" className="mt-0 outline-none">
                <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold">Storyboard</h2>
                    <p className="text-sm text-muted-foreground">
                      {scenes?.filter(s => s.imageUrl).length ?? 0} of {scenes?.length ?? 0} scenes have AI visuals
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Generate all visuals */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono text-xs uppercase tracking-wider"
                      disabled={generateVisuals.isPending || !scenes?.length}
                      onClick={() => generateVisuals.mutate({ projectId }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListScenesQueryKey(projectId) })
                      })}
                    >
                      {generateVisuals.isPending
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating All…</>
                        : <><Wand2 className="w-3 h-3 mr-1" /> Generate All Visuals</>}
                    </Button>
                    {/* Save all images */}
                    {scenes?.some(s => s.imageUrl) && (
                      <Button
                        size="sm"
                        className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/90"
                        disabled={savingAllImages}
                        onClick={saveAllImages}
                      >
                        {savingAllImages
                          ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…</>
                          : <><Download className="w-3 h-3 mr-1" /> Save All Images</>}
                      </Button>
                    )}
                  </div>
                </div>
                
                {scenesLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
                  </div>
                ) : scenes?.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/10">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Scenes Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      Run the pipeline to plan scenes and generate visual prompts.
                    </p>
                    <Button onClick={() => setActiveTab('pipeline')}>Go to Pipeline</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenes?.map((scene) => {
                      const isGenerating = generatingScenes.has(scene.id);
                      return (
                        <Card key={scene.id} className="bg-card/40 border-border/50 overflow-hidden group">
                          {/* 9:16 image area */}
                          <div className="aspect-[9/16] bg-muted relative border-b border-border">
                            {isGenerating ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs font-mono text-muted-foreground">AI generating…</span>
                              </div>
                            ) : scene.imageUrl ? (
                              <>
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${scene.imageUrl})` }} />
                                {/* Hover overlay with actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs font-mono uppercase tracking-wider bg-primary hover:bg-primary/90 w-36"
                                    onClick={() => downloadSceneImage(scene)}
                                  >
                                    <Download className="w-3 h-3 mr-1" /> Save Image
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-mono uppercase tracking-wider w-36 border-white/30 text-white hover:bg-white/10"
                                    onClick={() => generateSceneImage(scene.id)}
                                  >
                                    <Wand2 className="w-3 h-3 mr-1" /> Regenerate
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 gap-3">
                                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-mono uppercase tracking-wider bg-primary hover:bg-primary/90"
                                  onClick={() => generateSceneImage(scene.id)}
                                >
                                  <Wand2 className="w-3 h-3 mr-1" /> Generate Image
                                </Button>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 z-10">
                              <Badge className="bg-black/80 text-white hover:bg-black font-mono text-[10px] uppercase">
                                Scene {scene.order}
                              </Badge>
                            </div>
                            <div className="absolute bottom-2 right-2 z-10">
                              <Badge variant="outline" className="bg-black/80 border-border text-white backdrop-blur font-mono text-[10px]">
                                {scene.duration}s
                              </Badge>
                            </div>
                          </div>

                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider border-primary/30 text-primary bg-primary/5">
                                {scene.cameraMovement.replace('_', ' ')}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] uppercase font-mono tracking-wider">
                                {scene.transitionStyle}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium leading-tight mb-2 line-clamp-2">{scene.description}</p>
                            <p className="text-xs text-muted-foreground line-clamp-3 font-mono leading-relaxed opacity-80">{scene.imagePrompt}</p>
                            {/* Bottom action row */}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-[11px] font-mono uppercase tracking-wider"
                                disabled={isGenerating}
                                onClick={() => generateSceneImage(scene.id)}
                              >
                                {isGenerating
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <><Wand2 className="w-3 h-3 mr-1" />{scene.imageUrl ? 'Redo' : 'Generate'}</>}
                              </Button>
                              {scene.imageUrl && (
                                <Button
                                  size="sm"
                                  className="flex-1 h-7 text-[11px] font-mono uppercase tracking-wider bg-primary hover:bg-primary/90"
                                  onClick={() => downloadSceneImage(scene)}
                                >
                                  <Download className="w-3 h-3 mr-1" /> Save
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="captions" className="mt-0 outline-none">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Captions Editor</h2>
                    <p className="text-sm text-muted-foreground">Fine-tune timing and text.</p>
                  </div>
                </div>
                
                {captionsLoading ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : captions?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/10">
                    <Type className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Captions Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      Generate captions from the pipeline to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {captions?.map((caption) => (
                      <div key={caption.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card/60 transition-colors group border border-transparent hover:border-border/50">
                        <div className="w-24 text-right font-mono text-xs text-muted-foreground shrink-0">
                          {caption.startTime.toFixed(1)}s - {caption.endTime.toFixed(1)}s
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm ${caption.isHook ? 'font-bold text-primary' : caption.emphasis ? 'text-white font-medium' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`}>
                            {caption.text}
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Info Panel */}
        <div className="w-80 flex-shrink-0 bg-sidebar border-l border-border/50 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-border/50 bg-card/30">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-bold">Metadata</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {project.transcription && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Mic2 className="w-3 h-3" /> Source Transcript
                  </h4>
                  <div className="text-xs text-foreground/80 leading-relaxed bg-background/50 p-3 rounded-md border border-border/50">
                    {project.transcription.substring(0, 150)}...
                  </div>
                </div>
              )}
              
              {project.emotionalTone && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Tone:</span>
                      <span className="font-medium text-primary capitalize">{project.emotionalTone}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Topic:</span>
                      <span className="font-medium truncate max-w-[120px]">{project.topic}</span>
                    </div>
                    {project.storyArc && (
                      <div className="mt-2 text-xs bg-card p-2 rounded border border-border/50 text-muted-foreground">
                        Arc: {project.storyArc}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {project.hookText && (
                <div>
                   <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 text-primary">
                    <Wand2 className="w-3 h-3" /> The Hook
                  </h4>
                  <div className="text-xs font-bold text-foreground leading-relaxed bg-primary/10 border border-primary/20 p-3 rounded-md">
                    "{project.hookText}"
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
