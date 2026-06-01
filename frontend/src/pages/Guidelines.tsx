import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle, ChevronDown, ChevronUp, Shield, GraduationCap,
  Briefcase, CheckCircle2, DollarSign, Users, Calendar,
  Clock, AlertTriangle, BookOpen, UserPlus, FileText, Sparkles
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  role?: 'CEO' | 'ADMIN' | 'TEACHER';
}

const Guidelines: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Auto-detect role to set default active role tab
  const getInitialRole = (): 'CEO' | 'ADMIN' | 'TEACHER' => {
    if (currentUser?.role === 'TEACHER') return 'TEACHER';
    if (currentUser?.role === 'ADMIN') return 'ADMIN';
    return 'CEO'; // CEO / DEV default
  };

  const [activeRole, setActiveRole] = useState<'CEO' | 'ADMIN' | 'TEACHER'>(getInitialRole());
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs: FAQItem[] = [
    {
      question: "O'quvchi to'lovini guruhga bog'lash nima uchun muhim?",
      answer: "O'quvchi to'lovini ma'lum bir guruhga bog'lash — o'qituvchining oylik maoshini to'g'ri va adolatli hisoblash uchun o'ta muhim. Tizim o'qituvchi oyligini uning guruhlaridagi yig'ilgan to'lovlar (Collected payments) ulushiga qarab hisoblaydi. Agar to'lov guruhga bog'lanmasa, u umumiy to'lov bo'lib qoladi va o'qituvchi balansida aks etmaydi.",
      role: 'ADMIN'
    },
    {
      question: "O'qituvchi oyligini qanday hisoblash va to'lash kerak?",
      answer: "Direktor (CEO) 'Moliya' sahifasidagi 'Oyliklar' tabiga kirib, kerakli oyni tanlaydi. Tizim avtomatik ravishda har bir o'qituvchining guruhlari kesimida yig'ilgan real to'lovlarni va o'qituvchining belgilangan foiz ulushini hisoblab chiqadi. 'To'lash' tugmasini bosib, asosiy oylikni tahrirlash, bonus qo'shish va izoh yozish mumkin. To'lov amalga oshirilgach, xarajatlar ro'yxatida avtomatik 'Oylik' toifasidagi chiqim yaratiladi.",
      role: 'CEO'
    },
    {
      question: "Guruhlar uchun oylik to'lovlarni qanday hisobdan chiqarish (charge) kerak?",
      answer: "Oylik to'lovlarni o'quvchilar balansidan chegirish (qarzdorlik yozish) uchun Direktor 'Moliya' sahifasida 'Hisobdan chiqarish' tugmasini bosishi kerak. Bu amal barcha faol guruhlardagi faol o'quvchilar balansidan belgilangan oylik to'lov miqdorini bir vaqtning o'zida ayirib tashlaydi. Ushbu tugmani bosgandan so'ng, u keyingi oygacha nofaollashadi va qayta bosib bo'lmaydi.",
      role: 'CEO'
    },
    {
      question: "O'quvchini qanday arxivlash va o'chirish mumkin?",
      answer: "Faoliyati tugagan o'quvchini profilidan yoki o'quvchilar ro'yxatidan 'Arxivlash' tugmasi orqali arxivga o'tkazish mumkin. Arxivlangan o'quvchilar 'O'quvchilar' bo'limidagi 'Arxiv' tabida turadi. Arxivdagi o'quvchini qayta tiklash (Restore) yoki butunlay o'chirish (Delete) mumkin. Butunlay o'chirish huquqi faqat CEO va DEV rollariga berilgan.",
      role: 'ADMIN'
    },
    {
      question: "Davomatni qanday to'g'ri yuritish kerak?",
      answer: "O'qituvchilar o'z guruhlarining dars kunlarida 'Davomat' bo'limiga kirib, kerakli guruh va sanani tanlashadi. Har bir o'quvchi uchun: 'Keldi' (yashil), 'Kelmadi' (qizil) yoki 'Kechikdi' (sariq) holatlarini belgilab saqlashadi. Davomat real vaqtda ota-onalar va ma'muriyatga ma'lumot berish uchun xizmat qiladi.",
      role: 'TEACHER'
    },
    {
      question: "Lidlar (Leads) tizimi qanday ishlaydi?",
      answer: "Yangi kelgan arizalar yoki qiziquvchilar 'Lidlar' bo'limida ro'yxatga olinadi. Liddan o'quvchi guruhga qo'shilishi bilan administrator 'O'quvchiga aylantirish' (Convert to Student) tugmasini bosadi va u asosiy o'quvchilar bazasiga o'tkaziladi. Bu marketing samaradorligini va konversiyani o'lchashga yordam beradi.",
      role: 'ADMIN'
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Welcome Banner ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 p-6 md:p-8 text-white shadow-lg overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase backdrop-blur-sm">
              <Sparkles className="h-3 w-3" /> Tizim bo'yicha yo'riqnoma
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              PROZONE CRM bilan ishlash
            </h1>
            <p className="text-indigo-100 font-medium text-sm md:text-base max-w-2xl">
              Platformaning barcha imkoniyatlaridan to'g'ri foydalanish, rollarga xos vazifalar va muhim moliyaviy qoidalar bilan tanishing.
            </p>
          </div>
          {currentUser && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0">
              <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Sizning rolingiz</p>
              <p className="text-lg font-black text-white">{currentUser.display_name}</p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-500 text-white shadow-sm">
                {currentUser.role_display}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Role Guide Section ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rollarga xos yo'riqnomalar</h2>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">Kerakli rolni tanlab, unga xos asosiy funksiyalar bilan tanishing:</p>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-800 transition-colors w-full sm:w-auto overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveRole('CEO')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeRole === 'CEO'
                  ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" /> Direktor (CEO)
            </button>
            <button
              onClick={() => setActiveRole('ADMIN')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeRole === 'ADMIN'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" /> Administrator
            </button>
            <button
              onClick={() => setActiveRole('TEACHER')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeRole === 'TEACHER'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" /> O'qituvchi
            </button>
          </div>
        </div>

        {/* Tab content cards */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 md:p-8 shadow-sm transition-all">
          {activeRole === 'CEO' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center justify-center shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Direktor / Tizim rahbari yo'riqnomasi</h3>
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400">Markazning barcha moliyaviy va tashkiliy ko'rsatkichlarini boshqarish</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Asosiy imkoniyatlar:</h4>
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Moliya Tahlili:</strong> Kirim, chiqim, sof foyda va kutilayotgan olinmagan qarzlarni real vaqtda ko'rish va davrlar bo'yicha solishtirish.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Guruhlarni hisobdan chiqarish:</strong> Har oy boshida 'Moliya' sahifasidagi 'Hisobdan chiqarish' tugmasini bosib, barcha guruhlarga oylik to'lov yozish.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>O'qituvchilar oyliklari boshqaruvi:</strong> Oyliklar tabida yig'ilgan to'lovlarga qarab oyliklarni hisoblash, bonus qo'shish va to'lovni tasdiqlash.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Kengaytirilgan Hisobotlar:</strong> Ro'yxatdan o'tgan yangi o'quvchilar, tark etganlar dinamikasi va guruh to'liqligi bo'yicha chuqur tahlillar.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-extrabold text-sm">
                    <DollarSign className="h-5 w-5 text-violet-600" /> Muhim Moliyaviy Qoida:
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    Tizimda oyliklar hech qachon avtomatik hisobga o'tkazilmaydi. Adminlar to'lovlarni to'liq kiritishini kuting, so'ngra <strong>"Moliya &rarr; Oyliklar"</strong> bo'limida oylikni tekshirib <strong>"To'lash"</strong> tugmasini bosing. Bu sizga moliyaviy intizomni va to'lovlarning to'g'riligini doimiy nazorat qilish imkonini beradi.
                  </p>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-bold border-t border-violet-100 dark:border-violet-900/40 pt-3">
                    💡 Tavsiya: Oyliklarni har oyning 1-5 sanalarida yakunlab to'lashingiz maqsadga muvofiq.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'ADMIN' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shadow-sm">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Administrator yo'riqnomasi</h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Kunlik operatsiyalar, to'lovlar va o'quvchilar harakatini nazorat qilish</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Asosiy imkoniyatlar:</h4>
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Lidlar va Arizalar:</strong> Yangi qiziquvchilarni ro'yxatga olish, qo'ng'iroq qilish va faol guruhga qo'shilishi bilan ularni o'quvchiga aylantirish.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>To'lovlarni kiritish:</strong> To'lov qabul qilinganda uni o'quvchi o'qiydigan tegishli guruhga biriktirib kiritish (Moliya bo'limi orqali).
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Qarzdorlarni kuzatish:</strong> Balansi minusga tushgan o'quvchilarga tezkor to'lov tugmasi orqali to'lov qabul qilish va ularning qarzlarini yopish.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-extrabold text-sm">
                    <Users className="h-5 w-5 text-blue-600" /> O'quvchilarni Arxivlash Qoidasi:
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    O'qishni to'xtatgan o'quvchini hech qachon ro'yxatdan o'chirib yubormang. Uni avval <strong>"Arxivlash"</strong> qiling. Shunda o'quvchining barcha o'tgan oylardagi to'lov va davomat tarixi saqlanib qoladi va keyinchalik oylik hisoblashda chalkashliklar kelib chiqmaydi.
                  </p>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-bold border-t border-blue-100 dark:border-blue-900/40 pt-3">
                    ⚠️ Muhim: Yangi to'lov kiritganda 'Guruh' maydonini to'g'ri tanlang!
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'TEACHER' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">O'qituvchi yo'riqnomasi</h3>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400">Guruhlar ro'yxati, davomat va kunlik dars jadvallari</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Asosiy imkoniyatlar:</h4>
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Guruhlar va O'quvchilar:</strong> O'zingizga biriktirilgan guruhlarni ko'rish, har bir guruhdagi faol o'quvchilar ro'yxati va ularning kontaktlari bilan tanishish.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Kunlik Davomat olish:</strong> Dars o'tiladigan kunlarda dars vaqtida o'quvchilarning darsdagi ishtirokini belgilash (Keldi, Kelmadi yoki Kechikdi).
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Shaxsiy Dars Jadvali:</strong> O'zingizning haftalik va kunlik dars soatlaringiz, xonalar va dars vaqtlarini oson kuzatish.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-extrabold text-sm">
                    <Calendar className="h-5 w-5 text-purple-600" /> Dars jadvallari:
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    Darsingiz boshlanishidan oldin jadvalingizni va dars o'tiladigan xonani <strong>"Jadval"</strong> bo'limidan tekshirib oling. Davomatni dars tugashidan oldin to'ldirib, saqlash tugmasini bosishni unutmang. Bu o'quvchilar ota-onalari va rahbariyatga hisobot yuborishda muhim hisoblanadi.
                  </p>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-bold border-t border-purple-100 dark:border-purple-900/40 pt-3">
                    📝 Eslatma: Davomatni faqat o'zingiz dars beradigan guruhlar uchun yura olasiz.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Visual Workflow Steps ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tizimning asosiy jarayonlar zanjiri</h2>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">Yangi liddan to to'liq oylik maosh hisoblanishigacha bo'lgan to'liq zanjir:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative group hover:border-violet-500/50 transition-colors">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mb-4">1</div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Lid &rarr; O'quvchi</h4>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Yangi arizalar ro'yxatga olinib, guruhga qo'shilgach, o'quvchiga aylantiriladi.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative group hover:border-violet-500/50 transition-colors">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm mb-4">2</div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Guruhlarni Hisoblash (Batch Charge)</h4>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Har oy boshida 'Moliya' sahifasida 'Hisobdan chiqarish' bosilib, barcha guruhlar uchun oylik to'lov yoziladi.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative group hover:border-violet-500/50 transition-colors">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">3</div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">To'lov Qabul Qilish</h4>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">O'quvchi to'lov qilganda tizimga kiritilib, aniq bir guruhga bog'lanadi.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm relative group hover:border-violet-500/50 transition-colors">
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm mb-4">4</div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Maosh Hisoblash & To'lash</h4>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Yig'ilgan to'lovlarga qarab oyliklar hisoblanadi va Direktor tomonidan to'lanadi.</p>
          </div>
        </div>
      </div>

      {/* ── Expandable FAQs ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tezkor savollar va javoblar (FAQ)</h2>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">Tizimdan foydalanishda ko'p beriladigan savollar to'plami:</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm transition-all divide-y divide-gray-100 dark:divide-slate-800">
          {faqs.map((faq, index) => {
            const isOpen = openFAQ === index;
            return (
              <div key={index} className="py-4 first:pt-2 last:pb-2">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between text-left gap-4 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-gray-400 shrink-0" />
                    <span className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                      {faq.question}
                    </span>
                  </div>
                  <div className="shrink-0 p-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200/50 dark:border-slate-700/50 text-gray-400">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                
                {isOpen && (
                  <div className="mt-3 ml-8 text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed space-y-2 animate-slideDown">
                    <p>{faq.answer}</p>
                    {faq.role && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 border border-gray-200/40 dark:border-slate-700">
                        Mas'ul rol: {faq.role === 'CEO' ? 'Direktor' : faq.role === 'ADMIN' ? 'Administrator' : "O'qituvchi"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Callout Box ── */}
      <div className="rounded-2xl border border-amber-200/60 dark:border-amber-950/30 bg-amber-50/50 dark:bg-amber-950/15 p-5 flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Muhim Eslatma</h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
            Tizimdagi moliyaviy ma'lumotlar va barcha o'zgarishlar audit loglarida saqlanadi. Oyliklar, to'lovlar va xarajatlar ro'yxati har doim to'liq to'g'ri kiritilishi shart. Xatoliklar yuz berganda ularni o'chirmasdan, tahrirlash yoki yangi to'lov orqali tuzatish tavsiya etiladi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;
