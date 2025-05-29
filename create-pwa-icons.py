#!/usr/bin/env python3
"""
PWA Icon Generator for Flag Status Monitor
Generates all required PWA icons from the base favicon
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_flag_icon(size):
    """Create a flag icon at the specified size"""
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate dimensions
    margin = size // 10
    flag_width = size - (margin * 2)
    flag_height = int(flag_width * 0.53)  # US flag ratio
    
    # Position flag in center
    flag_x = margin
    flag_y = (size - flag_height) // 2
    
    # Draw flag background (white)
    draw.rectangle([flag_x, flag_y, flag_x + flag_width, flag_y + flag_height], 
                   fill=(255, 255, 255, 255))
    
    # Draw red stripes
    stripe_height = flag_height // 13
    for i in range(0, 13, 2):  # Every other stripe is red
        stripe_y = flag_y + (i * stripe_height)
        draw.rectangle([flag_x, stripe_y, flag_x + flag_width, stripe_y + stripe_height], 
                       fill=(178, 34, 52, 255))  # Flag red
    
    # Draw blue union
    union_width = int(flag_width * 0.4)
    union_height = int(flag_height * 0.54)
    draw.rectangle([flag_x, flag_y, flag_x + union_width, flag_y + union_height], 
                   fill=(60, 59, 110, 255))  # Flag blue
    
    # Add stars (simplified as white dots)
    star_size = max(2, size // 64)
    rows = 9
    for row in range(rows):
        stars_in_row = 6 if row % 2 == 0 else 5
        star_y = flag_y + (row * union_height // rows) + (union_height // (rows * 2))
        
        for star in range(stars_in_row):
            star_x = flag_x + (star * union_width // stars_in_row) + (union_width // (stars_in_row * 2))
            if row % 2 == 1:  # Offset every other row
                star_x += union_width // (stars_in_row * 2)
            
            draw.ellipse([star_x - star_size, star_y - star_size, 
                         star_x + star_size, star_y + star_size], 
                        fill=(255, 255, 255, 255))
    
    # Add subtle border
    border_color = (0, 0, 0, 50)
    draw.rectangle([flag_x, flag_y, flag_x + flag_width, flag_y + flag_height], 
                   outline=border_color, width=max(1, size // 128))
    
    return img

def main():
    """Generate all PWA icons"""
    # Create assets directory if it doesn't exist
    os.makedirs('assets', exist_ok=True)
    
    # Icon sizes needed for PWA
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    print("🇺🇸 Generating PWA icons for Flag Status Monitor...")
    
    for size in sizes:
        print(f"  Creating {size}x{size} icon...")
        icon = create_flag_icon(size)
        
        # Save with high quality
        filename = f'assets/icon-{size}x{size}.png'
        icon.save(filename, 'PNG', optimize=True, quality=95)
        
        print(f"  ✅ Saved {filename}")
    
    # Also create apple-touch-icon
    print("  Creating Apple Touch Icon (180x180)...")
    apple_icon = create_flag_icon(180)
    apple_icon.save('assets/apple-touch-icon.png', 'PNG', optimize=True, quality=95)
    print("  ✅ Saved assets/apple-touch-icon.png")
    
    # Create favicon.ico
    print("  Creating favicon.ico...")
    favicon_sizes = [16, 32, 48]
    favicon_images = []
    for size in favicon_sizes:
        favicon_images.append(create_flag_icon(size))
    
    favicon_images[0].save('assets/favicon.ico', format='ICO', 
                          sizes=[(16, 16), (32, 32), (48, 48)])
    print("  ✅ Saved assets/favicon.ico")
    
    print("\n🎉 All PWA icons generated successfully!")
    print("📱 Your app is now ready for installation on all devices!")

if __name__ == '__main__':
    main() 