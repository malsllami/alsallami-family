import logo from './assets/logo.png'

import { useNavigate } from 'react-router-dom'

import { useRef, useState, useCallback } from 'react'

export default function App() {

  const navigate = useNavigate()

  const heroRef = useRef(null)
  const [logoOffset, setLogoOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * -9
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -7
    setLogoOffset({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setLogoOffset({ x: 0, y: 0 })
  }, [])

  return (

    <div className="min-h-screen bg-[#36404a] text-white flex flex-col">

      {/* Header */}

      {/* Hero Section */}

      <main
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex-1 flex items-center px-8 lg:px-20"
      >

        <div className="w-full flex flex-col-reverse lg:flex-row items-center justify-between gap-8 py-10">

          {/* النص */}

          <div className="flex-1 max-w-[600px] text-center lg:text-right">

            {/* زينة علوية */}
            <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
              <span className="h-px w-12 bg-[var(--gold-main)] opacity-40 block"></span>
              <span className="font-nav text-xs tracking-[0.45em] text-[var(--gold-main)] opacity-70">
                الموقع الرسمي
              </span>
              <span className="h-px w-12 bg-[var(--gold-main)] opacity-40 block"></span>
            </div>

            {/* العنوان المتدرج */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.4]">

              أهلاً بكم في

              <br />

              <span className="lg:mr-8 block">

                الموقع الرسمي

              </span>

              <span className="lg:mr-20 block text-[var(--gold-main)]">

                لعائلة السلامي

              </span>

            </h1>

            {/* الوصف */}
            <p className="mt-6 text-xl text-gray-300 leading-loose max-w-[480px] lg:mr-0 mx-auto">

              منصة تجمع أفراد العائلة وتوثّق تاريخنا
              وتحفظ ذكرياتنا للأجيال القادمة

            </p>

            {/* فاصل ذهبي */}
            <div className="mt-8 flex items-center gap-2 justify-center lg:justify-start">
              <div className="h-px w-16 bg-gradient-to-l from-[var(--gold-main)] to-transparent opacity-50"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold-main)] opacity-60 flex-shrink-0"></div>
              <div className="h-px w-16 bg-gradient-to-r from-[var(--gold-main)] to-transparent opacity-50"></div>
            </div>

            {/* أزرار CTA */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">

              <button
                onClick={() => navigate('/family-tree')}
                className="btn-primary font-nav bg-[var(--gold-main)] text-black px-10 py-[14px] rounded-2xl text-lg font-bold"
              >
                استعراض شجرة العائلة
              </button>

              <button
                onClick={() => navigate('/register')}
                className="btn-outline font-nav border-2 border-[var(--gold-main)] text-[var(--gold-main)] px-10 py-[13px] rounded-2xl text-lg font-bold hover:bg-[var(--gold-main)] hover:text-black"
              >
                انضم إلى العائلة
              </button>

            </div>

          </div>

          {/* اللوقو */}

          <div className="flex-1 relative flex justify-center items-center">

            <div className="absolute w-[340px] h-[340px] bg-[var(--gold-main)] opacity-[0.04] blur-[70px] rounded-full pointer-events-none"></div>

            <div
              className="relative rounded-[30px] p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(198,161,107,0.22)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 40px rgba(0,0,0,0.18), 0 24px 64px rgba(0,0,0,0.5)',
                transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)`,
                transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >

              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.04)',
                  border: '1px solid rgba(198,161,107,0.12)',
                }}
              >
                <img
                  src={logo}
                  alt="شعار عائلة السلامي"
                  className="w-[285px] md:w-[330px] lg:w-[365px] object-contain block"
                  style={{
                    filter:
                      'contrast(1.3) saturate(1.5) brightness(0.92) drop-shadow(0 3px 6px rgba(0,0,0,0.55)) drop-shadow(0 -1px 2px rgba(220,170,70,0.25))',
                  }}
                />
              </div>

            </div>

          </div>

        </div>

      </main>

        {/* قسم النبذة */}

<section className="px-8 lg:px-20 pb-20">

  <div className="bg-white/5 border border-white/10 rounded-[35px] p-10 backdrop-blur-sm">

    <div className="text-center mb-14">

      <h2 className="text-4xl lg:text-5xl font-bold text-[var(--gold-main)]">

        نبذة عن العائلة

      </h2>

      <p className="mt-6 text-xl text-gray-300 leading-loose max-w-[900px] mx-auto">

        منصة عائلية تهدف إلى توثيق شجرة عائلة السلامي
        وحفظ تاريخ العائلة وربط أفرادها وتعزيز التواصل
        بين الأجيال الحالية والقادمة.

      </p>

    </div>

    {/* البطاقات */}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

      {/* بطاقة */}

      <div className="site-card rounded-3xl p-8">

        <h3 className="text-2xl font-bold text-[var(--gold-main)] mb-4">

          توثيق النسب

        </h3>

        <p className="text-gray-300 leading-loose">

          حفظ التسلسل العائلي وتوثيق بيانات الأفراد
          والأجيال بطريقة منظمة وحديثة.

        </p>

      </div>

      {/* بطاقة */}

      <div className="site-card rounded-3xl p-8">

        <h3 className="text-2xl font-bold text-[var(--gold-main)] mb-4">

          التواصل العائلي

        </h3>

        <p className="text-gray-300 leading-loose">

          تعزيز التواصل بين أفراد العائلة
          وربط الأجيال الحالية بتاريخها وجذورها.

        </p>

      </div>

      {/* بطاقة */}

      <div className="site-card rounded-3xl p-8">

        <h3 className="text-2xl font-bold text-[var(--gold-main)] mb-4">

          الصناديق العائلية

        </h3>

        <p className="text-gray-300 leading-loose">

          استعراض الصناديق والمشاريع العائلية
          وأهدافها وآلية الاستفادة منها.

        </p>

      </div>

      </div>

  </div>

</section>


{/* قسم شجرة العائلة */}

<section className="px-8 lg:px-20 pb-20">

  <div className="bg-gradient-to-br from-[#3b4652] to-[#2f3843] rounded-[35px] border border-white/10 p-10 overflow-hidden">

    <div className="flex flex-col lg:flex-row items-center justify-between gap-16">

      {/* النص */}

      <div className="max-w-[650px] text-center lg:text-right">

        <h2 className="text-4xl lg:text-5xl font-bold text-[var(--gold-main)]">

          شجرة العائلة

        </h2>

        <p className="mt-8 text-xl text-gray-300 leading-loose">

          استعرض التسلسل العائلي الكامل لعائلة السلامي
          بطريقة تفاعلية حديثة تتيح التنقل بين الأجيال
          والفخوذ بسهولة ووضوح.

        </p>

        {/* الاحصائيات */}

        <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-10">

          <div className="bg-black/10 border border-white/10 rounded-2xl px-6 py-5 min-w-[140px]">

            <h3 className="text-3xl font-bold text-[var(--gold-main)]">

              250+

            </h3>

            <p className="mt-2 text-gray-300">

              أفراد العائلة

            </p>

          </div>

          <div className="bg-black/10 border border-white/10 rounded-2xl px-6 py-5 min-w-[140px]">

            <h3 className="text-3xl font-bold text-[var(--gold-main)]">

              12

            </h3>

            <p className="mt-2 text-gray-300">

              فخذ عائلي

            </p>

          </div>

          <div className="bg-black/10 border border-white/10 rounded-2xl px-6 py-5 min-w-[140px]">

            <h3 className="text-3xl font-bold text-[var(--gold-main)]">

              7

            </h3>

            <p className="mt-2 text-gray-300">

              أجيال موثقة

            </p>

          </div>

        </div>

        {/* زر */}

        <button
          onClick={() => navigate('/family-tree')}
          className="btn-primary font-nav mt-10 bg-[var(--gold-main)] text-black px-8 py-4 rounded-2xl text-xl font-bold"
        >

           استعراض الشجرة

        </button>

      </div>

      {/* الشكل */}

      <div className="relative">

        <div className="w-[320px] h-[320px] rounded-full border border-[var(--gold-main)]/30 flex items-center justify-center">

          <div className="w-[240px] h-[240px] rounded-full border border-[var(--gold-main)]/20 flex items-center justify-center">

            <div className="w-[160px] h-[160px] rounded-full bg-[var(--gold-main)]/10 border border-[var(--gold-main)]/20 flex items-center justify-center text-[var(--gold-main)] text-2xl font-bold">

              شجرة
              <br />
              العائلة

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>


{/* قسم الصناديق العائلية */}

<section className="px-8 lg:px-20 pb-24">

  {/* العنوان */}

  <div className="text-center mb-14">

    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--gold-main)]">

      الصناديق العائلية

    </h2>

    <p className="mt-6 text-xl text-gray-300 leading-loose max-w-[900px] mx-auto">

      مبادرات وصناديق عائلية تهدف إلى دعم أفراد العائلة
      وتعزيز التكافل الاجتماعي بين الجميع.

    </p>

  </div>

  {/* البطاقات */}

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

    {/* بطاقة */}

    <div className="site-card rounded-[30px] p-8">

      <div className="w-16 h-16 rounded-2xl bg-[var(--gold-main)]/10 flex items-center justify-center text-[var(--gold-main)] text-3xl mb-6">

        💍

      </div>

      <h3 className="text-2xl font-bold text-[var(--gold-main)]">

        صندوق الزواج

      </h3>

      <p className="mt-5 text-gray-300 leading-loose">

        دعم الشباب المقبلين على الزواج
        ومساعدتهم في بداية حياتهم الأسرية.

      </p>

      <div className="mt-8 flex items-center justify-between">

        <span className="text-gray-400">

          25 مستفيد

        </span>

        <button onClick={() => navigate('/funds')} className="font-nav text-[var(--gold-main)] hover:underline">

          التفاصيل

        </button>

      </div>

    </div>

    {/* بطاقة */}

    <div className="site-card rounded-[30px] p-8">

      <div className="w-16 h-16 rounded-2xl bg-[var(--gold-main)]/10 flex items-center justify-center text-[var(--gold-main)] text-3xl mb-6">

        🎓

      </div>

      <h3 className="text-2xl font-bold text-[var(--gold-main)]">

        صندوق التعليم

      </h3>

      <p className="mt-5 text-gray-300 leading-loose">

        دعم الطلاب والطالبات وتشجيع
        التفوق العلمي داخل العائلة.

      </p>

      <div className="mt-8 flex items-center justify-between">

        <span className="text-gray-400">

          40 مستفيد

        </span>

        <button onClick={() => navigate('/funds')} className="font-nav text-[var(--gold-main)] hover:underline">

          التفاصيل

        </button>

      </div>

    </div>

    {/* بطاقة */}

    <div className="site-card rounded-[30px] p-8">

      <div className="w-16 h-16 rounded-2xl bg-[var(--gold-main)]/10 flex items-center justify-center text-[var(--gold-main)] text-3xl mb-6">

        🤝

      </div>

      <h3 className="text-2xl font-bold text-[var(--gold-main)]">

        صندوق التكافل

      </h3>

      <p className="mt-5 text-gray-300 leading-loose">

        تقديم المساعدات والدعم
        للحالات الإنسانية داخل العائلة.

      </p>

      <div className="mt-8 flex items-center justify-between">

        <span className="text-gray-400">

          18 مستفيد

        </span>

        <button onClick={() => navigate('/funds')} className="font-nav text-[var(--gold-main)] hover:underline">

          التفاصيل

        </button>

      </div>

    </div>

  </div>

</section>


{/* قسم المقالات */}

<section className="px-8 lg:px-20 pb-24">

  <div className="text-center mb-14">

    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--gold-main)]">

      المقالات

    </h2>

    <p className="mt-6 text-xl text-gray-300 leading-loose max-w-[900px] mx-auto">

      تعرّف على تاريخ وادي حلي بن يعقوب وجذور عائلة السلامي
      وموروثها الأصيل الممتد عبر الأجيال.

    </p>

  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

    <div className="site-card rounded-[30px] p-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--gold-main)]/10 flex items-center justify-center text-[var(--gold-main)] text-3xl mb-6">
        🏔️
      </div>
      <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-nav" style={{ background: 'rgba(198,161,107,0.12)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.2)' }}>
        جغرافيا وتاريخ
      </div>
      <h3 className="text-xl font-bold text-[var(--gold-main)] mb-3">وادي حلي بن يعقوب</h3>
      <p className="text-gray-300 leading-loose text-sm">
        من أعرق أودية المنطقة الجنوبية، يمتد عبر قرى عريقة تحمل إرثاً تاريخياً وعمقاً قبلياً أصيلاً.
      </p>
      <div className="mt-6">
        <button onClick={() => navigate('/articles')} className="font-nav text-[var(--gold-main)] hover:underline text-sm">
          قراءة المقال ←
        </button>
      </div>
    </div>

    <div className="site-card rounded-[30px] p-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-3xl mb-6">
        🏕️
      </div>
      <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-nav" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
        تراث وقبائل
      </div>
      <h3 className="text-xl font-bold text-white mb-3">قبائل الوادي</h3>
      <p className="text-gray-300 leading-loose text-sm">
        قبائل عربية أصيلة توارثت هذه الأرض جيلاً بعد جيل، تتميز بقيمها الراسخة وتماسكها الاجتماعي.
      </p>
      <div className="mt-6">
        <button onClick={() => navigate('/articles')} className="font-nav text-[var(--gold-main)] hover:underline text-sm">
          اقرأ المزيد ←
        </button>
      </div>
    </div>

    <div className="site-card rounded-[30px] p-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-3xl mb-6">
        🏘️
      </div>
      <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-nav" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
        قرى ومواقع
      </div>
      <h3 className="text-xl font-bold text-white mb-3">حدبة السلالمة</h3>
      <p className="text-gray-300 leading-loose text-sm">
        موطن عائلة السلامي الأصلي، تقع على ربوة مشرفة على الوادي وتتميز بطبيعتها الجبلية الجميلة.
      </p>
      <div className="mt-6">
        <button onClick={() => navigate('/articles')} className="font-nav text-[var(--gold-main)] hover:underline text-sm">
          اقرأ المزيد ←
        </button>
      </div>
    </div>

  </div>

  <div className="text-center mt-10">
    <button
      onClick={() => navigate('/articles')}
      className="btn-outline font-nav border-2 border-[var(--gold-main)] text-[var(--gold-main)] px-10 py-[13px] rounded-2xl text-lg font-bold hover:bg-[var(--gold-main)] hover:text-black transition-all duration-300"
    >
      عرض جميع المقالات
    </button>
  </div>

</section>


{/* قسم الإحصائيات */}

<section className="px-8 lg:px-20 pb-24">

  <div className="bg-gradient-to-br from-[#3b4652] to-[#2f3843] rounded-[35px] border border-white/10 p-12">

    <div className="text-center mb-16">

      <h2 className="text-4xl lg:text-5xl font-bold text-[var(--gold-main)]">

        إحصائيات العائلة

      </h2>

      <p className="mt-6 text-xl text-gray-300">

        نظرة عامة على بيانات العائلة والمنصة

      </p>

    </div>

    {/* البطاقات */}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">

      {/* بطاقة */}

      <div className="site-card rounded-[30px] p-8 text-center">

        <h3 className="text-5xl font-bold text-[var(--gold-main)]">

          250+

        </h3>

        <p className="mt-5 text-lg text-gray-300">

          إجمالي الأعضاء

        </p>

      </div>

      {/* بطاقة */}

      <div className="site-card rounded-[30px] p-8 text-center">

        <h3 className="text-5xl font-bold text-[var(--gold-main)]">

          12

        </h3>

        <p className="mt-5 text-lg text-gray-300">

          عدد الفخوذ

        </p>

      </div>

      {/* بطاقة */}

      <div className="site-card rounded-[30px] p-8 text-center">

        <h3 className="text-5xl font-bold text-[var(--gold-main)]">

          3

        </h3>

        <p className="mt-5 text-lg text-gray-300">

          الصناديق العائلية

        </p>

      </div>

      {/* بطاقة */}

      <div className="site-card rounded-[30px] p-8 text-center">

        <h3 className="text-5xl font-bold text-[var(--gold-main)]">

          1500+

        </h3>

        <p className="mt-5 text-lg text-gray-300">

          زيارات المنصة

        </p>

      </div>

    </div>

  </div>

</section>

{/* Footer */}

<footer className="px-8 lg:px-20 pb-10">

  <div className="bg-white/5 border border-white/10 rounded-[35px] px-8 py-10">

    <div className="flex flex-col lg:flex-row items-center justify-between gap-10">

      {/* الهوية */}

      <div className="text-center lg:text-right">

        <h2 className="text-3xl font-bold text-[var(--gold-main)]">

          عائلة السلامي

        </h2>

        <p className="mt-4 text-gray-300 leading-loose max-w-[500px]">

          منصة عائلية تهدف إلى توثيق شجرة العائلة
          وتعزيز التواصل بين أفراد العائلة والأجيال القادمة.

        </p>

      </div>

      {/* التواصل */}

      <div className="flex flex-col gap-5">

        {/* واتساب */}

        <a
          href="https://wa.me/966555889581"
          target="_blank"
          className="site-card flex items-center gap-4 px-6 py-4 rounded-2xl"
        >

          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-2xl">

            🟢

          </div>

          <div className="text-right">

            <h3 className="font-bold">

              واتساب

            </h3>

            <p className="text-gray-300 text-sm">

              00966555889581

            </p>

          </div>

        </a>

        {/* البريد */}

        <a
          href="mailto:malsllami@gmail.com"
          className="site-card flex items-center gap-4 px-6 py-4 rounded-2xl"
        >

          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-2xl">

            ✉️

          </div>

          <div className="text-right">

            <h3 className="font-bold">

              البريد الإلكتروني

            </h3>

            <p className="text-gray-300 text-sm">

              malsllami@gmail.com

            </p>

          </div>

        </a>

      </div>

    </div>

    {/* الحقوق */}

    <div className="mt-10 pt-6 border-t border-white/10 text-center text-gray-400 text-sm">

      جميع الحقوق محفوظة © عائلة السلامي

    </div>

  </div>

</footer>

  </div>

  )

}

