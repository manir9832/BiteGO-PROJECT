

# import os
# import cloudinary
# import cloudinary.uploader

# # .env থেকে Cloudinary কনফিগারেশন লোড
# cloudinary.config(
#     cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
#     api_key=os.environ.get("CLOUDINARY_API_KEY"),
#     api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
#     secure=True
# )

# def upload_file(file_bytes: bytes, filename: str = None, folder: str = "bitego") -> str:
#     """
#     ফাইল বাইট রিসিভ করে Cloudinary-তে আপলোড করে এবং সেগুলোর Secure URL রিটার্ন করে।
#     """
#     try:
#         response = cloudinary.uploader.upload(
#             file_bytes,
#             folder=folder,
#             public_id=filename,
#             resource_type="auto"
#         )
#         return response.get("secure_url")
#     except Exception as e:
#         raise RuntimeError(f"Cloudinary upload failed: {str(e)}")
















import os
import cloudinary
import cloudinary.uploader

# Cloudinary Setup
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

def init_storage():
    """Cloudinary doesn't need init, keeping for signature compatibility."""
    return True

def upload_file_to_cloudinary(file_bytes: bytes, folder: str = "bitego") -> dict:
    """
    Uploads byte data to Cloudinary and returns secure URL.
    """
    try:
        res = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="auto"
        )
        return {
            "url": res.get("secure_url"),
            "public_id": res.get("public_id")
        }
    except Exception as e:
        raise RuntimeError(f"Cloudinary upload error: {str(e)}")