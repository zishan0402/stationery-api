const authorize = (allowedRole) => {
    return(req, res, next) => {
    if (req.user.role !== allowedRole) {
        return res.status(403).json({
            success: false,
            message: "You dont have the permission",
            })
        }
        next();
    }
}

module.exports = { authorize };