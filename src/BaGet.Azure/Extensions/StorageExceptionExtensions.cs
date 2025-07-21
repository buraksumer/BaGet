using System.Net;
using Microsoft.Azure.Cosmos.Table;

namespace BaGet.Azure
{
    internal static class StorageExceptionExtensions
    {
        public static bool IsAlreadyExistsException(this StorageException e)
        {
            return e?.RequestInformation?.HttpStatusCode == (int?)HttpStatusCode.Conflict;
        }

        public static bool IsNotFoundException(this StorageException e)
        {
            return e?.RequestInformation?.HttpStatusCode == (int?)HttpStatusCode.NotFound;
        }

        public static bool IsPreconditionFailedException(this StorageException e)
        {
            return e?.RequestInformation?.HttpStatusCode == (int?)HttpStatusCode.PreconditionFailed;
        }
    }
}
