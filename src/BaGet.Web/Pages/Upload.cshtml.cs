using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BaGet.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;

namespace BaGet.Web
{
    public class UploadModel : PageModel
    {
        private readonly IPackageIndexingService _indexer;
        private readonly IAuthenticationService _authentication;
        private readonly IOptionsSnapshot<BaGetOptions> _options;

        public UploadModel(
            IPackageIndexingService indexer,
            IAuthenticationService authentication,
            IOptionsSnapshot<BaGetOptions> options)
        {
            _indexer = indexer ?? throw new ArgumentNullException(nameof(indexer));
            _authentication = authentication ?? throw new ArgumentNullException(nameof(authentication));
            _options = options ?? throw new ArgumentNullException(nameof(options));
        }

        [BindProperty]
        public IFormFile PackageFile { get; set; }

        [BindProperty]
        public string ApiKey { get; set; }

        public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
        {
            ViewData["WorkingDirectory"] = Directory.GetCurrentDirectory();
            
            try
            {
                // Read-only mode kontrolü
                if (_options.Value.IsReadOnlyMode)
                {
                    ViewData["UploadResult"] = "Server salt okunur modda. Paket yüklenemez.";
                    return Page();
                }

                // API key kontrolü
                if (string.IsNullOrWhiteSpace(ApiKey))
                {
                    ViewData["UploadResult"] = "API Key gereklidir.";
                    return Page();
                }

                if (!await _authentication.AuthenticateAsync(ApiKey, cancellationToken))
                {
                    ViewData["UploadResult"] = "Geçersiz API Key!";
                    return Page();
                }
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