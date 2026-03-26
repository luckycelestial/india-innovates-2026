from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import requests
from io import BytesIO

def get_decimal_from_dms(dms, ref):
    """
    Convert GPS DMS (Degrees, Minutes, Seconds) to decimal degrees.
    """
    # Pillow 10+ returns GPS coordinates as tuples of floats
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_exif_gps(image_url):
    """
    Extracts GPS coordinates and timestamp from a photo URL.
    Returns: {lat: float, lon: float, timestamp: str} or None
    """
    try:
        response = requests.get(image_url, timeout=10)
        img = Image.open(BytesIO(response.content))
        
        info = img._getexif()
        if not info:
            return None

        exif_data = {}
        for tag, value in info.items():
            decoded = TAGS.get(tag, tag)
            exif_data[decoded] = value

        gps_info = {}
        if 'GPSInfo' in exif_data:
            for key in exif_data['GPSInfo'].keys():
                decode = GPSTAGS.get(key, key)
                gps_info[decode] = exif_data['GPSInfo'][key]

        if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
            lat = get_decimal_from_dms(gps_info['GPSLatitude'], gps_info['GPSLatitudeRef'])
            lon = get_decimal_from_dms(gps_info['GPSLongitude'], gps_info['GPSLongitudeRef'])
            
            # Extract timestamp if available
            timestamp = exif_data.get('DateTimeOriginal') or exif_data.get('DateTime')
            
            return {
                "latitude": lat,
                "longitude": lon,
                "timestamp": timestamp,
                "software": exif_data.get('Software'),
                "make": exif_data.get('Make'),
                "model": exif_data.get('Model')
            }
            
        return None
    except Exception as e:
        print(f"EXIF Extraction Error: {str(e)}")
        return None
