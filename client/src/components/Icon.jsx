import React from 'react';
import {
  Home, BookOpen, BarChart3, Trophy, Star, Flame, RefreshCw, Volume2,
  Pencil, PenLine, XCircle, Target, Sparkles, GraduationCap,
  Plus, LogOut, Users, Award, Trash2, Gift,
  Triangle, Square, Circle, Heart, Apple, Car, Shirt,
  Palette, Hash, Headphones, Calculator, BookText,
  Cat, Dog, Rabbit, Panda, PawPrint, Smile, Sun, Cloud, Flower, Bird, Fish,
  Music, Mic, Brain, Gamepad2, Rocket, Crown, Medal, ThumbsUp,
  CheckCircle2, X, AlertCircle, Info, Settings, User, UserPlus,
  Edit, ListChecks, Bell, MapPin, Clock, Play, Pause, ChevronRight,
  Bookmark, Flag, Tag, Image, Camera, Database, Globe, Compass,
  Droplet, Zap, Lock, Unlock, Eye, EyeOff, Mail, Shapes, Scale,
} from 'lucide-react';

const map = {
  home: Home,
  book: BookOpen,
  chart: BarChart3,
  trophy: Trophy,
  star: Star,
  flame: Flame,
  refresh: RefreshCw,
  speaker: Volume2,
  pencil: Pencil,
  pen: PenLine,
  bookText: BookText,
  wrong: XCircle,
  target: Target,
  sparkles: Sparkles,
  grad: GraduationCap,
  plus: Plus,
  logout: LogOut,
  users: Users,
  award: Award,
  trash: Trash2,
  gift: Gift,
  triangle: Triangle,
  square: Square,
  circle: Circle,
  heart: Heart,
  apple: Apple,
  car: Car,
  shirt: Shirt,
  palette: Palette,
  hash: Hash,
  headphones: Headphones,
  calculator: Calculator,
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  panda: Panda,
  paw: PawPrint,
  smile: Smile,
  sun: Sun,
  cloud: Cloud,
  flower: Flower,
  bear: Bird,
  bird: Bird,
  fish: Fish,
  music: Music,
  mic: Mic,
  brain: Brain,
  gamepad: Gamepad2,
  rocket: Rocket,
  crown: Crown,
  medal: Medal,
  thumbsUp: ThumbsUp,
  check: CheckCircle2,
  x: X,
  alert: AlertCircle,
  info: Info,
  settings: Settings,
  user: User,
  userPlus: UserPlus,
  edit: Edit,
  listChecks: ListChecks,
  bell: Bell,
  mapPin: MapPin,
  clock: Clock,
  play: Play,
  pause: Pause,
  chevronRight: ChevronRight,
  bookmark: Bookmark,
  flag: Flag,
  tag: Tag,
  image: Image,
  camera: Camera,
  database: Database,
  globe: Globe,
  compass: Compass,
  droplet: Droplet,
  zap: Zap,
  lock: Lock,
  unlock: Unlock,
  eye: Eye,
  eyeOff: EyeOff,
  mail: Mail,
  shapes: Shapes,
  scale: Scale,
};

/**
 * 统一图标组件，避免 emoji 字体依赖
 * @param {string} name 图标名
 * @param {number} size 图标尺寸，默认 22
 * @param {string} className 额外 className
 * @param {string} color 颜色，可选
 */
export default function Icon({ name, size = 22, className = '', strokeWidth = 2.2, color, ...rest }) {
  const Cmp = map[name];
  if (!Cmp) {
    console.warn(`[Icon] 未知图标: ${name}`);
    return null;
  }
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} color={color} {...rest} />;
}

export const ICON_NAMES = Object.keys(map);
