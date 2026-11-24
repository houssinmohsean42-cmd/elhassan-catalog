/* إعدادات الكتالوج — اختياري:
   لو عندك Google Sheets فيه الأصناف والأسعار، انشره كـ CSV
   (ملف > مشاركة > نشر على الويب > CSV) وحط الرابط هنا بين علامتي التنصيص.
   الكتالوج هيقرأ منه تلقائياً بدل products.json.
   أعمدة الشيت بالترتيب: code,name,pieces,price,category,image
   (image اختياري: رابط صورة المنتج، وسيبه فاضي لو مفيش). */
const CATALOG_CONFIG = {
  sheetsCsvUrl: ""
};
