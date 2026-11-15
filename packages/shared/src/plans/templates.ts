import type { Gender } from '../onboarding';
import type { Slot } from './slots';

/**
 * main       – the day's big compound lift, heaviest work
 * secondary  – another compound movement
 * accessory  – isolation work
 * core / conditioning – fixed prescriptions
 */
export type SlotRole = 'main' | 'secondary' | 'accessory' | 'core' | 'conditioning';

export interface TemplateSlot {
  slot: Slot;
  role: SlotRole;
}

export interface TemplateDay {
  /** i18n key suffix, e.g. "upper_a" → t('plan.day.upper_a') */
  key: string;
  /** Slots in priority order: shorter sessions keep only the first N. */
  slots: TemplateSlot[];
}

/**
 * Who a template is written for. "all" templates are neutral and always
 * available. To add a women-focused programme, add a template with
 * `audience: 'female'` and the same `daysPerWeek`; it will be preferred
 * automatically for members who chose "female" in onboarding.
 */
export type TemplateAudience = 'all' | Exclude<Gender, 'prefer_not_to_say'>;

export interface PlanTemplate {
  id: string;
  /** Bump when a template changes so stored plans record what they were built from. */
  version: number;
  audience: TemplateAudience;
  daysPerWeek: number;
  days: TemplateDay[];
}

const s = (slot: Slot, role: SlotRole): TemplateSlot => ({ slot, role });

const FULL_BODY_A: TemplateDay = {
  key: 'full_body_a',
  slots: [
    s('squat', 'main'),
    s('horizontal_push', 'main'),
    s('horizontal_pull', 'secondary'),
    s('core', 'core'),
    s('hamstring_curl', 'accessory'),
    s('lateral_raise', 'accessory'),
    s('triceps', 'accessory'),
    s('calves', 'accessory'),
  ],
};

const FULL_BODY_B: TemplateDay = {
  key: 'full_body_b',
  slots: [
    s('hinge', 'main'),
    s('vertical_push', 'main'),
    s('vertical_pull', 'secondary'),
    s('core', 'core'),
    s('lunge', 'secondary'),
    s('chest_fly', 'accessory'),
    s('biceps', 'accessory'),
    s('rear_delt', 'accessory'),
  ],
};

const FULL_BODY_C: TemplateDay = {
  key: 'full_body_c',
  slots: [
    s('leg_press', 'main'),
    s('incline_push', 'main'),
    s('vertical_pull', 'secondary'),
    s('core', 'core'),
    s('glute', 'secondary'),
    s('rear_delt', 'accessory'),
    s('biceps', 'accessory'),
    s('triceps', 'accessory'),
  ],
};

const UPPER_A: TemplateDay = {
  key: 'upper_a',
  slots: [
    s('horizontal_push', 'main'),
    s('horizontal_pull', 'main'),
    s('vertical_push', 'secondary'),
    s('vertical_pull', 'secondary'),
    s('core', 'core'),
    s('lateral_raise', 'accessory'),
    s('triceps', 'accessory'),
    s('biceps', 'accessory'),
  ],
};

const UPPER_B: TemplateDay = {
  key: 'upper_b',
  slots: [
    s('vertical_pull', 'main'),
    s('incline_push', 'main'),
    s('horizontal_pull', 'secondary'),
    s('chest_fly', 'accessory'),
    s('core', 'core'),
    s('rear_delt', 'accessory'),
    s('biceps', 'accessory'),
    s('triceps', 'accessory'),
  ],
};

const LOWER_A: TemplateDay = {
  key: 'lower_a',
  slots: [
    s('squat', 'main'),
    s('hinge', 'secondary'),
    s('lunge', 'secondary'),
    s('hamstring_curl', 'accessory'),
    s('core', 'core'),
    s('calves', 'accessory'),
    s('quad_iso', 'accessory'),
    s('lower_back', 'accessory'),
  ],
};

const LOWER_B: TemplateDay = {
  key: 'lower_b',
  slots: [
    s('hinge', 'main'),
    s('leg_press', 'secondary'),
    s('glute', 'secondary'),
    s('quad_iso', 'accessory'),
    s('core', 'core'),
    s('hamstring_curl', 'accessory'),
    s('calves', 'accessory'),
    s('lunge', 'accessory'),
  ],
};

const PUSH: TemplateDay = {
  key: 'push',
  slots: [
    s('horizontal_push', 'main'),
    s('vertical_push', 'secondary'),
    s('incline_push', 'secondary'),
    s('lateral_raise', 'accessory'),
    s('core', 'core'),
    s('triceps', 'accessory'),
    s('chest_fly', 'accessory'),
    s('triceps', 'accessory'),
  ],
};

const PULL: TemplateDay = {
  key: 'pull',
  slots: [
    s('vertical_pull', 'main'),
    s('horizontal_pull', 'secondary'),
    s('rear_delt', 'accessory'),
    s('biceps', 'accessory'),
    s('core', 'core'),
    s('horizontal_pull', 'secondary'),
    s('biceps', 'accessory'),
    s('lower_back', 'accessory'),
  ],
};

const LEGS: TemplateDay = { ...LOWER_A, key: 'legs' };

const withKey = (day: TemplateDay, key: string): TemplateDay => ({ ...day, key });

export const PLAN_TEMPLATES: PlanTemplate[] = [
  { id: 'full_body_2', version: 1, audience: 'all', daysPerWeek: 2, days: [FULL_BODY_A, FULL_BODY_B] },
  {
    id: 'full_body_3',
    version: 1,
    audience: 'all',
    daysPerWeek: 3,
    days: [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C],
  },
  {
    id: 'upper_lower_4',
    version: 1,
    audience: 'all',
    daysPerWeek: 4,
    days: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  },
  {
    id: 'upper_lower_ppl_5',
    version: 1,
    audience: 'all',
    daysPerWeek: 5,
    days: [UPPER_A, LOWER_A, PUSH, PULL, LOWER_B],
  },
  {
    id: 'ppl_6',
    version: 1,
    audience: 'all',
    daysPerWeek: 6,
    days: [
      withKey(PUSH, 'push_a'),
      withKey(PULL, 'pull_a'),
      withKey(LEGS, 'legs_a'),
      withKey(PUSH, 'push_b'),
      withKey(PULL, 'pull_b'),
      withKey(LOWER_B, 'legs_b'),
    ],
  },
];

/**
 * Picks the template for a member: an audience-specific template if one
 * exists for their gender, otherwise the neutral one.
 */
export function selectTemplate(
  daysPerWeek: number,
  gender: Gender,
  templates: PlanTemplate[] = PLAN_TEMPLATES,
): PlanTemplate {
  const forDays = templates.filter((t) => t.daysPerWeek === daysPerWeek);
  const specific = forDays.find((t) => t.audience !== 'all' && t.audience === gender);
  const neutral = forDays.find((t) => t.audience === 'all');
  const template = specific ?? neutral;
  if (!template) throw new Error(`No plan template for ${daysPerWeek} days per week`);
  return template;
}
