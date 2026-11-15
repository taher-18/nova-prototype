import type { MovementPattern } from './catalog';

interface Mistakes {
  en: string[];
  ar: string[];
}

/** Common mistakes, written per movement pattern so every exercise has them. */
export const COMMON_MISTAKES: Record<MovementPattern, Mistakes> = {
  horizontal_press: {
    en: [
      'Flaring the elbows straight out to the sides — keep them about 45° from your body.',
      'Bouncing the weight off the chest instead of controlling it down.',
      'Lifting the hips off the bench to push more weight.',
    ],
    ar: [
      'فتح المرفقين للجانبين بالكامل — اجعلهما بزاوية 45 درجة تقريبًا من جسمك.',
      'ارتداد الوزن من على الصدر بدل إنزاله بتحكم.',
      'رفع الحوض عن البنش لدفع وزن أكبر.',
    ],
  },
  vertical_press: {
    en: [
      'Arching the lower back to push the weight up — brace your abs and glutes.',
      'Pressing the weight forward instead of straight overhead.',
      'Stopping halfway instead of using the full range of motion.',
    ],
    ar: [
      'تقويس أسفل الظهر لدفع الوزن — شد البطن والأرداف.',
      'دفع الوزن للأمام بدل أن يكون فوق الرأس مباشرة.',
      'التوقف في منتصف الحركة بدل استخدام المدى الكامل.',
    ],
  },
  chest_fly: {
    en: [
      'Bending and straightening the elbows — it turns the fly into a press.',
      'Going too heavy and dropping the arms too low, stressing the shoulders.',
      'Rushing the stretch at the bottom.',
    ],
    ar: [
      'ثني المرفقين وفردهما أثناء الحركة — يحوّلها إلى تمرين ضغط.',
      'استخدام وزن ثقيل وإنزال الذراعين أكثر من اللازم مما يجهد الكتف.',
      'التسرع في مرحلة التمدد في الأسفل.',
    ],
  },
  lateral_raise: {
    en: [
      'Swinging the body to lift the weight.',
      'Raising the arms above shoulder height and shrugging.',
      'Using a weight too heavy to control on the way down.',
    ],
    ar: [
      'مرجحة الجسم لرفع الوزن.',
      'رفع الذراعين أعلى من مستوى الكتف ورفع الأكتاف نحو الأذنين.',
      'استخدام وزن ثقيل لا يمكن التحكم فيه أثناء النزول.',
    ],
  },
  rear_delt: {
    en: [
      'Pulling with the arms instead of squeezing the shoulder blades.',
      'Using momentum and jerking the weight.',
      'Shrugging the shoulders up toward the ears.',
    ],
    ar: [
      'السحب بالذراعين بدل عصر لوحي الكتف.',
      'استخدام الاندفاع وشد الوزن بقوة.',
      'رفع الأكتاف نحو الأذنين.',
    ],
  },
  vertical_pull: {
    en: [
      'Leaning far back and turning it into a row.',
      'Not going all the way up — you lose the stretch on the back.',
      'Pulling with the arms only instead of driving the elbows down.',
    ],
    ar: [
      'الميل للخلف كثيرًا مما يحوّل التمرين إلى تجديف.',
      'عدم فرد الذراعين بالكامل في الأعلى فتفقد تمدد الظهر.',
      'السحب بالذراعين فقط بدل سحب المرفقين للأسفل.',
    ],
  },
  row: {
    en: [
      'Rounding the back — keep it flat and your chest up.',
      'Jerking the weight with your lower back.',
      'Not squeezing the shoulder blades at the top.',
    ],
    ar: [
      'تقويس الظهر — حافظ عليه مستقيمًا والصدر مرفوعًا.',
      'شد الوزن باستخدام أسفل الظهر.',
      'عدم عصر لوحي الكتف في نهاية الحركة.',
    ],
  },
  squat: {
    en: [
      'Letting the knees cave inward — push them out over the toes.',
      'Lifting the heels off the floor.',
      'Rounding the back or looking down at the bottom.',
    ],
    ar: [
      'دخول الركبتين للداخل — ادفعهما للخارج باتجاه أصابع القدمين.',
      'رفع الكعبين عن الأرض.',
      'تقويس الظهر أو النظر للأسفل في نهاية النزول.',
    ],
  },
  leg_press: {
    en: [
      'Locking the knees at the top.',
      'Lowering so far that the lower back lifts off the seat.',
      'Pushing through the toes instead of the whole foot.',
    ],
    ar: [
      'قفل الركبتين في الأعلى.',
      'النزول لدرجة أن أسفل الظهر يرتفع عن المقعد.',
      'الدفع بأطراف الأصابع بدل القدم كاملة.',
    ],
  },
  hinge: {
    en: [
      'Rounding the lower back — keep a neutral spine.',
      'Letting the bar or dumbbells drift away from the legs.',
      'Squatting the weight up instead of pushing the hips back.',
    ],
    ar: [
      'تقويس أسفل الظهر — حافظ على ظهر مستقيم.',
      'ابتعاد البار أو الدمبلز عن الرجلين.',
      'تحويل الحركة إلى سكوات بدل دفع الحوض للخلف.',
    ],
  },
  lunge: {
    en: [
      'Taking a step too short so the front knee shoots far past the toes.',
      'Letting the front knee cave inward.',
      'Leaning the torso forward.',
    ],
    ar: [
      'خطوة قصيرة جدًا فتتقدم الركبة الأمامية كثيرًا عن أصابع القدم.',
      'دخول الركبة الأمامية للداخل.',
      'ميل الجذع للأمام.',
    ],
  },
  glute_bridge: {
    en: [
      'Arching the lower back at the top instead of squeezing the glutes.',
      'Pushing through the toes instead of the heels.',
      'Rushing without a pause at the top.',
    ],
    ar: [
      'تقويس أسفل الظهر في الأعلى بدل عصر الأرداف.',
      'الدفع بأطراف الأصابع بدل الكعبين.',
      'التسرع دون توقف في الأعلى.',
    ],
  },
  leg_curl: {
    en: [
      'Lifting the hips off the pad.',
      'Dropping the weight quickly instead of lowering it slowly.',
      'Using a partial range of motion.',
    ],
    ar: [
      'رفع الحوض عن المقعد.',
      'ترك الوزن ينزل بسرعة بدل إنزاله ببطء.',
      'استخدام نصف المدى الحركي.',
    ],
  },
  leg_extension: {
    en: [
      'Kicking the weight up with momentum.',
      'Lifting the hips off the seat.',
      'Letting the weight slam down between reps.',
    ],
    ar: [
      'رفع الوزن بالاندفاع.',
      'رفع الحوض عن المقعد.',
      'ترك الوزن يرتطم بين التكرارات.',
    ],
  },
  calf_raise: {
    en: [
      'Bouncing at the bottom instead of pausing in the stretch.',
      'Using a short range of motion.',
      'Bending the knees to help the lift.',
    ],
    ar: [
      'الارتداد في الأسفل بدل التوقف في وضع التمدد.',
      'استخدام مدى حركي قصير.',
      'ثني الركبتين للمساعدة في الرفع.',
    ],
  },
  back_extension: {
    en: [
      'Over-arching the back at the top.',
      'Swinging up fast instead of moving with control.',
      'Rounding the back on the way down.',
    ],
    ar: [
      'تقويس الظهر بشكل زائد في الأعلى.',
      'الصعود بسرعة ومرجحة بدل التحكم في الحركة.',
      'تقويس الظهر أثناء النزول.',
    ],
  },
  biceps_curl: {
    en: [
      'Swinging the body to lift the weight.',
      'Letting the elbows drift forward.',
      'Not lowering the weight all the way down.',
    ],
    ar: [
      'مرجحة الجسم لرفع الوزن.',
      'تقدم المرفقين للأمام.',
      'عدم إنزال الوزن بالكامل.',
    ],
  },
  triceps_extension: {
    en: [
      'Moving the elbows — keep the upper arms still.',
      'Leaning over the weight to push with the body.',
      'Not fully straightening the arms.',
    ],
    ar: [
      'تحريك المرفقين — ثبّت الجزء العلوي من الذراع.',
      'الميل فوق الوزن للدفع بالجسم.',
      'عدم فرد الذراعين بالكامل.',
    ],
  },
  dip: {
    en: [
      'Going too deep and straining the shoulders.',
      'Shrugging the shoulders up toward the ears.',
      'Dropping fast instead of lowering with control.',
    ],
    ar: [
      'النزول لعمق زائد مما يجهد الكتفين.',
      'رفع الأكتاف نحو الأذنين.',
      'النزول بسرعة بدل التحكم في الحركة.',
    ],
  },
  core_plank: {
    en: [
      'Letting the hips sag toward the floor.',
      'Pushing the hips too high.',
      'Holding your breath.',
    ],
    ar: [
      'هبوط الحوض نحو الأرض.',
      'رفع الحوض لأعلى من اللازم.',
      'حبس النفس.',
    ],
  },
  core_crunch: {
    en: [
      'Pulling on the neck with your hands.',
      'Using momentum instead of the abs.',
      'Arching the lower back off the floor.',
    ],
    ar: [
      'شد الرقبة باليدين.',
      'الاعتماد على الاندفاع بدل عضلات البطن.',
      'رفع أسفل الظهر عن الأرض.',
    ],
  },
  conditioning: {
    en: [
      'Letting the hips rise too high.',
      'Losing form as you get tired — slow down instead.',
      'Holding your breath.',
    ],
    ar: [
      'ارتفاع الحوض لأعلى من اللازم.',
      'فقدان الوضع الصحيح مع التعب — أبطئ بدل ذلك.',
      'حبس النفس.',
    ],
  },
};
