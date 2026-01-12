export const getMediaContent = async (req, res) => {
  try {
    // Mock media content data
    const mediaContent = [
      {
        id: 1,
        title: 'Ready Player One Trailer',
        type: 'TRAILER',
        url: 'https://www.youtube.com/embed/cSp1dM2Vj48',
        thumbnail: 'https://via.placeholder.com/640x360/000000/00ffff?text=Ready+Player+One+Trailer'
      },
      {
        id: 2,
        title: 'Cyberpunk City Ambience',
        type: 'AMBIENCE',
        url: 'https://www.youtube.com/embed/W_FYy42bQG4',
        thumbnail: 'https://via.placeholder.com/640x360/000000/00ffff?text=Cyberpunk+City+Ambience'
      },
      {
        id: 3,
        title: 'Blade Runner 2049 Trailer',
        type: 'TRAILER',
        url: 'https://www.youtube.com/embed/gCcx85zbxz4',
        thumbnail: 'https://via.placeholder.com/640x360/000000/00ffff?text=Blade+Runner+2049+Trailer'
      },
      {
        id: 4,
        title: 'Synthwave Music Mix',
        type: 'AMBIENCE',
        url: 'https://www.youtube.com/embed/rVMdNyLKoQQ',
        thumbnail: 'https://via.placeholder.com/640x360/000000/00ffff?text=Synthwave+Music+Mix'
      }
    ];

    return res.status(200).json({
      success: true,
      media: mediaContent
    });

  } catch (error) {
    console.error('Get media content error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching media content',
      error: error.message
    });
  }
};
