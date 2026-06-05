import type { load } from 'cheerio';
import type { Severity, DetectedPattern } from '@/types';

type CheerioAPI = ReturnType<typeof load>;

export interface DetectorContext {
  html: string;
  $: CheerioAPI;
  url: string;
  pageTitle: string;
  bodyText: string;
}

export type DetectorResult = DetectedPattern;

export interface Detector {
  id: string;
  run(ctx: DetectorContext): DetectorResult;
}

export type { Severity, CheerioAPI };
