/**
 * Fallback home-page content used when the CMS (home_sections.settings_json) has no custom cards / reviews.
 * Copied verbatim from resources/views/storefront/home.php.
 */
export const DEFAULT_REVIEWS = {
  ar: [
    {
      name: 'د. خالد السعدون',
      city: 'الرياض',
      rating: 5,
      comment: 'عجوة العالية من أروع ما تذوقت، طرية وحبات منتقاة ونظافة تامة. تغليف الشحن المبرد ممتاز ووصلت في نفس اليوم.',
      product_name: 'عجوة المدينة المنورة العالية الملكية',
    },
    {
      name: 'أ. منيرة القحطاني',
      city: 'جدة',
      rating: 5,
      comment: 'صندوق تمرنا الخشبي فخم جداً ومناسب للإهداء الراقي. أهديته لوالدي في العيد وكان مبهوراً بدقة التنسيق وجودة التمور.',
      product_name: 'صندوق تمرنا الملكي الخشبي الفاخر',
    },
    {
      name: 'م. سلطان الشمري',
      city: 'الدمام',
      rating: 5,
      comment: 'السكري المفتل مقرمش شقار ولذاذة لا توصف. خدمة العملاء تعاملهم راقي ومحترف، أصبح متجر تمرنا خياري الدائم.',
      product_name: 'سكري القصيم مفتل درجة أولى',
    },
  ],
  en: [
    {
      name: 'Dr. Khaled Al-Saadoun',
      city: 'Riyadh',
      rating: 5,
      comment: 'Al-Aliyah Ajwa is the finest I have tasted—exceptionally soft, hand-selected, and pristine. The cold shipping packaging arrived same-day in perfect condition.',
      product_name: 'Royal Madinah Al-Aliyah Ajwa',
    },
    {
      name: 'Mounira Al-Qahtani',
      city: 'Jeddah',
      rating: 5,
      comment: 'The wooden gift trunk is truly prestigious and perfect for royal gifting. Presented it to my father on Eid and he was amazed by the quality and curation.',
      product_name: 'Tumurna Royal Wooden Gift Trunk',
    },
    {
      name: 'Eng. Sultan Al-Shammari',
      city: 'Dammam',
      rating: 5,
      comment: 'The Muftal Sukari is wonderfully crisp with golden sweetness. Exceptional customer care and prompt service. Tumurna is now our family favorite.',
      product_name: 'Qassim Muftal Sukari - Luxury Box',
    },
  ],
};

export const DEFAULT_FEATURES = {
  ar: [
    { icon: 'truck', title: 'شحن مبرد فائق السرعة', desc: 'أسطول سيارات شحن مبردة مجهزة بدرجات حرارة مثالية لحفظ قوام ورطوبة وجودة التمور الطازجة.' },
    { icon: 'award', title: 'ضمان الجودة الملكية ١٠٠٪', desc: 'تمور نخب أول منتقاة حبة بحبة ومفحوصة مخبرياً وفق معايير الهيئة العامة للغذاء والدواء.' },
    { icon: 'gift', title: 'تغليف إهداء فاخر', desc: 'صناديق خشبية ومخملية مصممة خصيصاً للمناسبات الملكية، والأعياد، وحفلات الاستقبال.' },
    { icon: 'store', title: 'فروع في الرياض وجدة والمدينة', desc: 'إمكانية الاستلام المباشر أو تذوق التمور الفاخرة عبر صالات عرضنا الراقية المنتشرة بالمملكة.' },
  ],
  en: [
    { icon: 'truck', title: 'Express Refrigerated Fleet', desc: 'Temperature-controlled refrigerated vehicles preserving moisture, texture, and prime freshness across KSA.' },
    { icon: 'award', title: '100% Royal Grade Certified', desc: 'Prime hand-picked dates, lab tested and certified under Saudi Food & Drug Authority standards.' },
    { icon: 'gift', title: 'Luxury Royal Gift Packaging', desc: 'Artisanal wooden and velvet presentation boxes crafted for VIP gifting, Eid, and prestigious receptions.' },
    { icon: 'store', title: 'Boutiques in Riyadh, Jeddah & Madinah', desc: 'Complimentary in-boutique tasting lounges and express local branch pickup throughout Saudi Arabia.' },
  ],
};

/** Feature icon aliases used by the CMS (`truck` -> truck, `award` -> shield-check ...). */
export const FEATURE_ICON_MAP = { truck: 'truck', award: 'shield-check', gift: 'gift', store: 'tree-palm' };
