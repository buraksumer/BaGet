using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BaGet.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BaGet.Web
{
    public class UploadModel : PageModel
    {
        private readonly IPackageIndexingService _indexer;

        public UploadModel(IPackageIndexingService indexer)
        {
            _indexer = indexer ?? throw new ArgumentNullException(nameof(indexer));
        }

        [BindProperty]
        public IFormFile PackageFile { get; set; }

        public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
        {
            ViewData["WorkingDirectory"] = Directory.GetCurrentDirectory();
            try
            {
                if (PackageFile == null || PackageFile.Length == 0)
                {
                    ViewData["UploadResult"] = "Lütfen bir dosya seçin.";
                    return Page();
                }

                if (!PackageFile.FileName.EndsWith(".nupkg", StringComparison.OrdinalIgnoreCase))
                {
                    ViewData["UploadResult"] = "Sadece .nupkg dosyaları yüklenebilir.";
                    return Page();
                }

                using (var tempStream = new MemoryStream())
                {
                    await PackageFile.CopyToAsync(tempStream, cancellationToken);
                    tempStream.Position = 0;
                    var result = await _indexer.IndexAsync(tempStream, cancellationToken);
                    switch (result)
                    {
                        case PackageIndexingResult.InvalidPackage:
                            ViewData["UploadResult"] = "Geçersiz paket!";
                            break;
                        case PackageIndexingResult.PackageAlreadyExists:
                            ViewData["UploadResult"] = "Bu paket zaten mevcut!";
                            break;
                        case PackageIndexingResult.Success:
                            ViewData["UploadResult"] = "Yükleme başarılı!";
                            break;
                        default:
                            ViewData["UploadResult"] = $"Bilinmeyen sonuç: {result}";
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                ViewData["UploadResult"] = $"Hata oluştu: {ex.Message}";
            }

            return Page();
        }
    }
} 