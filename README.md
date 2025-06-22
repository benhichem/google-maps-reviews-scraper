# Google Maps Reviews Scraper

A TypeScript-based web scraper that extracts detailed review data from Google Maps listings. This tool helps businesses and researchers analyze customer feedback by collecting review data in a structured format.

## Features

- Stealth browser configuration to avoid detection
- Automatic filtering of reviews by lowest ratings
- Dynamic scrolling to load more reviews
- Language support (defaults to English)
- Detailed review data extraction
- TypeScript support with type definitions
- Automatic retry mechanisms
- Rate limiting to avoid detection

## Installation

1. Clone the repository:

```bash
git clone https://github.com/benhichem/google-maps-reviews-scraper.git
```

2. Install dependencies:

```bash
npm install
```

## Usage

```typescript
import scrapeGoogleMapsReviews from "./src/index";

// Example usage:
const url = "https://maps.google.com/your-location-url";
const reviews = await scrapeGoogleMapsReviews(url);

// Example review data:
console.log(reviews[0]);
```

## Review Data Structure

The scraper returns an array of review objects with the following structure:

```typescript
type ReviewType = {
  id: string; // Unique identifier for the review
  reviewName: string; // Name of the reviewer
  starRating: string; // Number of stars given (1-5)
  responseFromOwner: boolean; // Whether the business owner responded
  reviewText: string; // Full text of the review
  isHighRating: boolean; // Whether this is a high rating review
  starLabel: string; // Text description of the star rating
  shareUrl: string; // URL to share this specific review
};
```

## Configuration

The scraper uses Puppeteer with stealth mode to avoid detection. You can configure:

- Browser settings (headless mode, window size)
- Language preferences
- Scroll behavior
- Review filtering
- Timeout settings
- Proxy support

## Requirements

- Node.js >= 20
- npm
- Puppeteer and its dependencies
- Chrome/Chromium browser

## Best Practices

1. Use appropriate delays between requests to avoid detection
2. Implement proper error handling
3. Respect Google's Terms of Service
4. Use the data responsibly
5. Consider rate limiting when scraping multiple locations

## Error Handling

The scraper includes built-in error handling for:

- Network errors
- Timeout errors
- Element not found errors
- Browser launch failures
- Review filtering failures

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational and research purposes only. The authors are not responsible for any misuse of this tool. Always ensure you comply with Google's Terms of Service when using this scraper.
