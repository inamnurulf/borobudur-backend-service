const testController = async (req, res, next) => {
  try {
    res.status(200).json({
      message: "Test controller response",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  testController,
};
