import cv2

def resize_image_to_video(image_path, video_path):
    # Read the video to get dimensions
    video = cv2.VideoCapture(video_path)
    success, video_frame = video.read()
    if not success:
        raise ValueError("Could not read video file")
    
    video_height = int(video_frame.shape[0])
    video_width = int(video_frame.shape[1])
    video.release()

    # Read and resize the image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Could not read image file")
        
    resized_image = cv2.resize(image, (video_width, video_height))
    return resized_image


if __name__ == "__main__":
    image_path = "img/input_4.png"
    video_path = "img/4_adjusted.mp4"
    resized_image = resize_image_to_video(image_path, video_path)
    cv2.imwrite("img/input_4_resized.png", resized_image)