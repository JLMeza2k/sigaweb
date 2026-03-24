import app from './config/express';

app.listen(app.get('port'), () => {
    console.log(`app escuchando en el puerto ${app.get('port')}`);
});
