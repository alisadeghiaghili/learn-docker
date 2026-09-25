export type ContainerStatus = 'created' | 'running' | 'exited' | 'unhealthy' | 'healthy';

export interface ImageLayer {
  id: string;
  instruction: string;
  sizeKb: number;
  stage?: string;
  cached?: boolean;
}

export interface ImageRef {
  name: string;
  repo: string;
  tag: string;
  imageId: string;
  layers: ImageLayer[];
  sizeKb: number;
  created: string;
  dangling?: boolean;
  parent?: string;
  /** Multi-stage: which stage produced this image */
  finalStage?: string;
  history?: Array<{ instruction: string; sizeKb: number; stage: string }>;
  /** Simple vuln summary for security labs */
  vulns?: { critical: number; high: number; medium: number };
  user?: string;
  healthcheck?: string | null;
  entrypoint?: string | null;
  cmd?: string | null;
}

export interface PortBinding {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
  hostIp?: string;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  imageId: string;
  status: ContainerStatus;
  command: string;
  createdAt: string;
  ports: PortBinding[];
  env: Record<string, string>;
  volumeMounts: Array<{ volume: string; path: string; bind?: boolean }>;
  networks: string[];
  hostname: string;
  exitCode?: number;
  volumeData: Record<string, string>;
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthcheck?: string | null;
  health?: 'starting' | 'healthy' | 'unhealthy' | null;
  user?: string;
  readOnly?: boolean;
  memLimit?: string;
  cpus?: number;
  labels?: Record<string, string>;
  /** For compose-managed containers */
  composeService?: string;
  composeProject?: string;
  logs: string[];
  execHistory: string[];
  capDrop?: string[];
  capAdd?: string[];
  noNewPrivileges?: boolean;
  memSwap?: string;
  securityOpt?: string[];
}

export interface Volume {
  name: string;
  createdAt: string;
  data: Record<string, string>;
  labels: Record<string, string>;
  driver?: string;
}

export interface Network {
  name: string;
  driver: 'bridge' | 'host' | 'none' | 'overlay' | 'macvlan';
  subnet?: string;
  containers: string[];
  createdAt: string;
  labels?: Record<string, string>;
  /** compose project isolation */
  composeProject?: string;
}

export interface ComposeService {
  name: string;
  image?: string;
  build?: string;
  ports?: Array<{ host: number; target: number }>;
  volumes?: Array<{ source: string; target: string }>;
  networks?: string[];
  depends_on?: string[];
  environment?: Record<string, string>;
  command?: string;
  restart?: string;
  healthcheck?: string;
}

export interface ComposeProject {
  name: string;
  services: ComposeService[];
  networks: string[];
  volumes: string[];
}

export interface DockerState {
  images: ImageRef[];
  containers: Container[];
  volumes: Volume[];
  networks: Network[];
  nextContainerSeq: number;
  nextImageSeq: number;
  nextNetworkSeq: number;
  compose?: ComposeProject | null;
  /** Simulated build context files */
  files: Record<string, string>;
  /** Counts of pruned objects for teaching */
  pruned?: { images: number; containers: number; volumes: number };
  /** Remote manifest reads (imagetools/manifest inspect) */
  registryInspected?: string[];
  signedImages?: string[];
  verifiedImages?: string[];
  sboms?: Array<{ image: string; packages: number; sample: string[] }>;
  loggedIn?: string[];
}

export interface RegistryImage {
  name: string;
  repo: string;
  tag: string;
  layers: ImageLayer[];
  sizeKb: number;
  description: string;
  dockerfile?: string[];
  vulns?: { critical: number; high: number; medium: number };
  user?: string;
}

export interface LevelStep {
  command: string;
  note: string;
  optional?: boolean;
}

export type LevelPack =
  | 'Setup'
  | 'Basics'
  | 'Build'
  | 'Registry'
  | 'Compose'
  | 'Networks'
  | 'Data'
  | 'Ops'
  | 'Security'
  | 'Under the hood'
  | 'Failure labs';

export interface QuizQuestion {
  id: string;
  pack: string;
  question: string;
  choices: [string, string, string];
  correct: 0 | 1 | 2;
  explain: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  series: LevelPack;
  brief: string;
  teaching: string;
  steps: LevelStep[];
  fieldNotes?: string[];
  learning: string[];
  hint?: string;
  par: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  start?: {
    prePulled?: string[];
    files?: Record<string, string>;
    compose?: ComposeProject;
    containers?: Array<
      Partial<Container> & {
        name: string;
        image: string;
      }
    >;
    broken?: boolean;
    /** Extra named volumes to create at start */
    volumes?: string[];
  };
  check: (state: DockerState) => boolean;
  /** Optional quiz gate after solve */
  quiz?: string[];
}

export interface LevelProgress {
  solved: boolean;
  bestCommands: number | null;
  attempts: number;
  quizScore?: number;
}

export interface AppProgress {
  levels: Record<string, LevelProgress>;
  quizzes?: Record<string, boolean>;
}

export interface EngineOutput {
  lines: string[];
  ok: boolean;
  mode?: 'sandbox' | 'levels' | 'help';
  solved?: boolean;
  levelId?: string;
}
