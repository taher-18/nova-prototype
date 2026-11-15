/**
 * Movement slots. A template day is a list of slots; the generator fills each
 * slot with the first exercise the member can do with their equipment and level.
 *
 * Candidates are in preference order. Repeating a slot in the same week
 * (e.g. "horizontal_push" on Push A and Push B) rotates through the list
 * so the member gets some variety.
 */
export const SLOT_CANDIDATES = {
  horizontal_push: [
    'Barbell_Bench_Press_-_Medium_Grip',
    'Dumbbell_Bench_Press',
    'Machine_Bench_Press',
    'Pushups',
  ],
  incline_push: [
    'Incline_Dumbbell_Press',
    'Barbell_Incline_Bench_Press_-_Medium_Grip',
    'Push-Ups_With_Feet_Elevated',
  ],
  chest_fly: ['Butterfly', 'Cable_Crossover', 'Dumbbell_Flyes', 'Push-Up_Wide', 'Dips_-_Chest_Version'],
  vertical_push: [
    'Seated_Dumbbell_Press',
    'Machine_Shoulder_Military_Press',
    'Standing_Military_Press',
    'Push-Ups_With_Feet_Elevated',
  ],
  lateral_raise: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise'],
  rear_delt: ['Face_Pull', 'Reverse_Machine_Flyes', 'Reverse_Flyes', 'Superman'],
  vertical_pull: [
    'Wide-Grip_Lat_Pulldown',
    'Close-Grip_Front_Lat_Pulldown',
    'Pullups',
    'Chin-Up',
    // Fallback when there is no bar or cable: a row still trains the back.
    'Bent_Over_Two-Dumbbell_Row',
  ],
  horizontal_pull: [
    'Seated_Cable_Rows',
    'Bent_Over_Barbell_Row',
    'One-Arm_Dumbbell_Row',
    'Bent_Over_Two-Dumbbell_Row',
    'Inverted_Row',
  ],
  squat: ['Barbell_Squat', 'Goblet_Squat', 'Hack_Squat', 'Dumbbell_Squat', 'Bodyweight_Squat'],
  leg_press: ['Leg_Press', 'Hack_Squat', 'Split_Squat_with_Dumbbells', 'Bodyweight_Walking_Lunge'],
  hinge: [
    'Romanian_Deadlift',
    'Barbell_Deadlift',
    'Stiff-Legged_Dumbbell_Deadlift',
    'Single_Leg_Glute_Bridge',
  ],
  lunge: ['Dumbbell_Lunges', 'Split_Squat_with_Dumbbells', 'Bodyweight_Walking_Lunge'],
  glute: ['Barbell_Hip_Thrust', 'Butt_Lift_Bridge', 'Single_Leg_Glute_Bridge', 'Glute_Kickback'],
  hamstring_curl: [
    'Lying_Leg_Curls',
    'Seated_Leg_Curl',
    'Stiff-Legged_Dumbbell_Deadlift',
    'Single_Leg_Glute_Bridge',
  ],
  quad_iso: ['Leg_Extensions', 'Split_Squat_with_Dumbbells', 'Bodyweight_Squat'],
  calves: ['Standing_Calf_Raises', 'Seated_Calf_Raise', 'Standing_Dumbbell_Calf_Raise'],
  lower_back: ['Hyperextensions_Back_Extensions', 'Superman'],
  biceps: ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'Hammer_Curls', 'Chin-Up'],
  triceps: [
    'Triceps_Pushdown',
    'Triceps_Pushdown_-_Rope_Attachment',
    'EZ-Bar_Skullcrusher',
    'Dumbbell_One-Arm_Triceps_Extension',
    'Bench_Dips',
  ],
  core: [
    'Plank',
    'Crunches',
    'Dead_Bug',
    'Flat_Bench_Lying_Leg_Raise',
    'Side_Bridge',
    'Air_Bike',
    'Cable_Crunch',
    'Hanging_Leg_Raise',
  ],
  conditioning: ['Mountain_Climbers'],
} as const satisfies Record<string, readonly string[]>;

export type Slot = keyof typeof SLOT_CANDIDATES;
