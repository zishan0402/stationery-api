const errorHandler = (err, req, res, next) => {

    console.error(err.stack);

    if (err.name === "CastError") {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }
    if (err.name === "ValidationError"){
        return res.status(400).json({
            message: "Validation failed",
            errors: Object.values(err.errors).map(error => error.message)
        });
    }

    res.status(500).json({
        message: "Something went wrong"
    });


};

module.exports = errorHandler;