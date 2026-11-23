#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>

int main(int argc, const char * argv[]) {
  @autoreleasepool {
    if (argc != 3) return 2;
    PDFDocument *document = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]]];
    NSURL *folder = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[2]] isDirectory:YES];
    if (!document) return 3;
    [[NSFileManager defaultManager] createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:nil];
    for (NSInteger index = 0; index < document.pageCount; index += 1) {
      NSImage *image = [[document pageAtIndex:index] thumbnailOfSize:NSMakeSize(2480, 3508) forBox:kPDFDisplayBoxMediaBox];
      NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc] initWithData:[image TIFFRepresentation]];
      NSData *png = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
      NSURL *file = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"porteco-page-%ld.png", (long)index + 1]];
      if (![png writeToURL:file atomically:YES]) return 4;
    }
  }
  return 0;
}
