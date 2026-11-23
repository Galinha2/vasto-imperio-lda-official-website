#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>

static void whiteMask(PDFPage *page, NSRect rect) {
  PDFAnnotation *annotation = [[PDFAnnotation alloc] initWithBounds:rect forType:PDFAnnotationSubtypeSquare withProperties:nil];
  annotation.color = NSColor.whiteColor;
  annotation.interiorColor = NSColor.whiteColor;
  PDFBorder *border = [PDFBorder new];
  border.lineWidth = 0;
  annotation.border = border;
  [page addAnnotation:annotation];
}

static void stamp(PDFPage *page, NSRect rect) {
  PDFAnnotation *annotation = [[PDFAnnotation alloc] initWithBounds:rect forType:PDFAnnotationSubtypeFreeText withProperties:nil];
  annotation.contents = @"VASTO IMPÉRIO";
  annotation.font = [NSFont boldSystemFontOfSize:13];
  annotation.fontColor = [NSColor colorWithCalibratedRed:0.03 green:0.47 blue:0.75 alpha:1];
  annotation.color = NSColor.clearColor;
  annotation.interiorColor = NSColor.clearColor;
  [page addAnnotation:annotation];
}

int main(int argc, const char * argv[]) {
  @autoreleasepool {
    if (argc != 4) return 2;
    NSURL *source = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]];
    NSURL *output = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[3]]];
    PDFDocument *document = [[PDFDocument alloc] initWithURL:source];
    if (!document) return 3;
    PDFPage *second = [document pageAtIndex:1];
    if (second) {
      whiteMask(second, NSMakeRect(552, 0, 43, 155));
      whiteMask(second, NSMakeRect(15, 0, 225, 118));
      stamp(second, NSMakeRect(27, 39, 130, 20));
    }
    PDFPage *first = [document pageAtIndex:0];
    if (first) stamp(first, NSMakeRect(22, 786, 110, 20));
    return [document writeToURL:output] ? 0 : 4;
  }
}
