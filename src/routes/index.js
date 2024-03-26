const express = require('express');
const generateAccessToken = require('../functions/token');
const authenticateToken = require('../middleware/tokenHandler');
const { firestoreDB, Timestamp, clientsCol, tokensCol, usersCol } = require('../configs/firestoreConf');
const { publicKey } = require('@metaplex-foundation/umi');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { dasApi } = require('@metaplex-foundation/digital-asset-standard-api');
const router = express.Router();
const dotenv = require('dotenv');
const crypto = require('crypto');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../configs/swagger');
const multiparty = require('multiparty');

// get config vars
dotenv.config();

router.use('/', swaggerUi.serve);

if(process.env.NODE_ENV !== 'production') {
  router.get('/',  swaggerUi.setup(swaggerSpec));
} else {
  router.get('/',  (req, res) => {
    return res.status(404).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "Page not found",
      }
    });
  });
  
}

// router.get('/', (req, res) => {
//   res.send({ message: 'Hello dis is api indek' });
// });

  /**
   * @swagger
   * /api/token:
   *   post:
   *     description: Get a token with X-API-Key for authentication to access all API.
   *     tags: [Token]
   *     consumes:
   *       - multipart/form-data
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: X-API-Key
   *         description: User API Key
   *         in: formData
   *         required: true
   *         schema:
   *           type: string
   *         style: form
   *     responses:
   *       200:
   *         description: Successful response with token generated.
   */

router.post('/token', async (req, res) => {
  const walletAddress = req.body['walletAddress'];
  if(!walletAddress) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "Wallet address is missing or empty"
      },
      "data": null
    });
  } else {
    const clientDocument = await usersCol.where('walletAddress', '==', walletAddress).get();
    console.log(clientDocument.docs.length);

    clientId = crypto.createHash('sha1').update(walletAddress).digest('hex');

    if(!clientDocument.empty) {
      const tokenDocument = await tokensCol.where('clientId', '==', clientId).get()
      if(!tokenDocument.empty) {
        const expiredAtTimestamp = tokenDocument.docs[0].get('expiredAt');
        const currentTimestamp = Timestamp.now();

        //Check if document exists but it is expired or not
        //If it's expired then make new document, if not then use existing document
        if(expiredAtTimestamp.toDate() > currentTimestamp.toDate()) {
          return res.status(200).json({
            "meta": {
              "code": res.statusCode,
              "status": res.status,
              "message": "Token has been created successfully!"
            },
            "data": {
              "id": tokenDocument.docs[0].id,
              "clientId": tokenDocument.docs[0].get('clientId'),
              "token": tokenDocument.docs[0].get('token'),
            }
          });
        } else {
          const token = generateAccessToken({walletAddress: walletAddress});
          const currentTime = new Date();
          const expiredTime = new Date(currentTime.getTime() + 30 * 60000);

          var addedDocument = await tokensCol.add({
            'clientId': clientId,
            'createdAt': Timestamp.fromDate(currentTime),
            'expiredAt': Timestamp.fromDate(expiredTime),
            'token': token,
          })

          return res.status(200).json({
            "meta": {
              "code": res.statusCode,
              "status": res.status,
              "message": "Token has been created successfully!"
            },
            "data": {
              "id": addedDocument.id,
              "clientId": clientId,
              "token": (await addedDocument.get()).get('token'),
            }
          });
        }
        
      } else {
        //Create token when no document is exists
        const token = generateAccessToken({walletAddress: walletAddress});
        const currentTime = new Date();
        const expiredTime = new Date(currentTime.getTime() + 30 * 60000);

        var addedDocument = await tokensCol.add({
          'clientId': clientId,
          'createdAt': Timestamp.fromDate(currentTime),
          'expiredAt': Timestamp.fromDate(expiredTime),
          'token': token,
        })

        return res.status(200).json({
          "meta": {
            "code": res.statusCode,
            "status": res.status,
            "message": "Token has been created successfully!"
          },
          "data": {
            "id": addedDocument.id,
            "clientId": clientId,
            "token": (await addedDocument.get()).get('token'),
          }
        });
      }
    } else {
      return res.status(400).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Wallet address is not valid"
        },
        "data": null
      });
    }
  }
});

  /**
   * @swagger
   * /api/stake:
   *   post:
   *     description: Change status of NFTs to be staked by specific wallet address and nft id.
   *     tags: [Staking]
   *     security:
   *       - bearerAuth: []
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: query
   *         required: true
   *         type: string
   *       - name: nftId
   *         description: User NFT ID
   *         in: query
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.post('/stake', authenticateToken, async (req, res) => {
  // executes after authenticateToken
  // ... 
  const walletAddress = req.body.walletAddress;
  const nftId = req.body.nftId;
  if(!walletAddress) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', walletAddress).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').where('nftId', '==', nftId).get();
      stakingSnapshot.docs[0].ref.update({
        'isStaked': true,
        'updatedAt': Timestamp.now(),
      });
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "NFT with id " + stakingSnapshot.docs[0]['nftId'] + " has been successfully staked."
        },
      });
    }
  }
});

  /**
   * @swagger
   * /api/stake/{walletAddress}:
   *   get:
   *     description: Retrieves a list of NFTs currently staked by the specified wallet address.
   *     tags: [Staking]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.get('/stake/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  var params = req.body;
  if(!walletAddress) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', walletAddress).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').get();
      const stakingData = stakingSnapshot.docs.map((data) => (data.data()));
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data retrieved successfully."
        },
        "data": stakingData,
      });
    }
  }
});

  /**
   * @swagger
   * /api/stakeall:
   *   post:
   *     description: Change all status of NFTs to be staked.
   *     tags: [Staking]
   *     security:              
   *       - bearerAuth: []     
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: formData
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.post('/stakeall', authenticateToken, async (req, res) => {
  // executes after authenticateToken
  // ... 
  var params = req.body;
  if(!params['walletAddress']) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', params["walletAddress"]).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').get();
      const updateData = await stakingSnapshot.docs.forEach((data)=> {
        data.ref.update({
          'isStaked': true,
          'updatedAt': Timestamp.now(),
        });
      });
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "All nfts staked successfully."
        },
      });
    }
  }
});

  /**
   * @swagger
   * /api/unstakeall:
   *   post:
   *     description: Change all status of NFTs to be unstaked.
   *     tags: [Staking]
   *     security:
   *       - bearerAuth: []
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: formData
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.post('/unstakeall', authenticateToken, async (req, res) => {
  // executes after authenticateToken
  // ... 
  var params = req.body;
  if(!params['walletAddress']) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', params["walletAddress"]).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').get();
      const updateData = await stakingSnapshot.docs.forEach((data)=> {
        data.ref.update({
          'isStaked': false,
          'updatedAt': Timestamp.now(),
        });
      });
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "All nfts staked successfully."
        },
      });
    }
  }
});

  /**
   * @swagger
   * /api/unstake:
   *   post:
   *     description: Change status of NFTs to be unstaked by specific wallet address and nft id.
   *     tags: [Staking]
   *     security:
   *       - bearerAuth: []
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: query
   *         required: true
   *         type: string
   *       - name: nftId
   *         description: User NFT ID
   *         in: query
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.post('/unstake', authenticateToken, async (req, res) => {
  const walletAddress = req.body.walletAddress;
  const nftId = req.body.nftId;
  if(!walletAddress) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', walletAddress).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').where('nftId', '==', nftId).get();
      stakingSnapshot.docs[0].ref.update({
        'isStaked': false,
        'updatedAt': Timestamp.now(),
      });
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "NFT with id " + stakingSnapshot.docs[0]['nftId'] + " has been successfully staked."
        },
      });
    }
  }
});

  /**
   * @swagger
   * /api/stake/points/{walletAddress}:
   *   get:
   *     description: Fetches the total points accumulated from all NFTs and get the higher NFTs point.
   *     tags: [Staking]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.get('/stake/points/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  if(!walletAddress) {
    return res.status(400).json({
      "meta": {
        "code": res.statusCode,
        "status": res.status,
        "message": "You must provide wallet address"
      },
      "data": null
    });
  } else {
    const userSnapshot = await usersCol.where('walletAddress', '==', walletAddress).get();
    if(userSnapshot.empty){
      return res.status(404).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data not found."
        },
        "data": null
      });
    } else {
      const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').orderBy('nftPoint', 'desc').get();
      const stakingData = stakingSnapshot.docs.map((data) => (data.data()));
      var totalPoint = 0;
      for(i = 0; i < stakingData.length; i++) {
        totalPoint += stakingData[i].nftPoint;
      }
      return res.status(200).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Data retrieved successfully."
        },
        "data": {
          "totalPoint": totalPoint,
          "highest": stakingData[0],
        },
      });
    }
  }
});

  /**
   * @swagger
   * /api/stats:
   *   get:
   *     description: Fetches NFTs Collection Stats from mainnet
   *     tags: [AAS]
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
router.get("/stats", async (req, res) => {
  const api_url = "https://api-mainnet.magiceden.dev/v2/collections/angry_apes_society/stats";
  const response = await fetch(api_url);
  const data = await response.json();
  res.send(data)
})

const fetchAllNfts = async (walletAddress) => {
  const umi = createUmi("https://api.mainnet-beta.solana.com").use(dasApi());
  const ownerPubKey = publicKey(walletAddress);
  let allNfts = [];
  let currentPage = 1;
  let hasMoreData = true;

  while (hasMoreData) {
      const response = await umi.rpc.getAssetsByOwner({
          owner: ownerPubKey,
          limit: 1000,
          page: currentPage,
      });

      if (response.items.length > 0) {
          allNfts = allNfts.concat(response.items);
          currentPage++;
      } else {
          hasMoreData = false;
      }
  }

  const filteredNfts = allNfts
      .filter(item => item.content.metadata && item.content.metadata.symbol === "AAS")
      .map(item => item.content);

  return filteredNfts;
};

  /**
   * @swagger
   * /fetch:
   *   post:
   *     description: Initiates the staking of an NFT which need walletAddress, this endpoint is responsible for verifying NFT ownership, checking if NFT is not on sale, and then marking it as staked in system.
   *     tags: [Staking]
   *     produces:
   *       - application/json
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - name: walletAddress
   *         description: User Wallet Address
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Data retrieved successfully.
   */
  router.post('/fetch', async (req, res) => {
    const walletAddress = req.body.walletAddress;
    const apiKey = req.body.apiKey;
    if(!apiKey) {
      return res.status(400).json({
        "meta": {
          "code": res.statusCode,
          "status": res.status,
          "message": "Authentication missing"
        },
        "data": null
      });
    } else {
      if(apiKey !== process.env.apiKey) {
        return res.status(400).json({
          "meta": {
            "code": res.statusCode,
            "status": res.status,
            "message": "Authentication Error"
          },
          "data": null
        });
      }
      if(!walletAddress) {
        return res.status(400).json({
          "meta": {
            "code": res.statusCode,
            "status": res.status,
            "message": "You must provide wallet address"
          },
          "data": null
        });
      } else {
        const userSnapshot = await usersCol.where('walletAddress', '==', walletAddress).get();
        if(userSnapshot.empty){
          try {
            const nfts = await fetchAllNfts(walletAddress);
  
            await usersCol.add({
              walletAddress: walletAddress,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            }).then(async (data) => {
              for(i = 0; i < nfts.length; i++){
                await data.collection('stakingInfo').add({
                  nftId: nfts[i].metadata.name.replace(/\D/g, ''),
                  nftName: nfts[i].metadata.name,
                  nftPoint: 0,
                  isStaked: false,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });
              }
            });
            return res.status(200).json({
              "meta": {
                "code": res.statusCode,
                "status": res.status,
                "message": "Data successfully fetched."
              },
            });
          } catch (error) {
            console.error('Error fetching NFTs:', error);
            return res.status(500).send({ error: 'Failed to fetch NFTs' });
          }
        } else {
          try {
            const nfts = await fetchAllNfts(walletAddress);
            const stakingSnapshot = await userSnapshot.docs[0].ref.collection('stakingInfo').get();
            console.log(stakingSnapshot.docs.length);
  
            const uniqueDatas = await nfts.filter((data) => !stakingSnapshot.docs.some((data2) => data.metadata.name === data2.get('nftName')));
            if(uniqueDatas.length != 0) {
              for(i = 0; i < uniqueDatas.length; i++){
                await userSnapshot.docs[0].ref.collection('stakingInfo').add({
                  nftId: uniqueDatas[i].metadata.name.replace(/\D/g, ''),
                  nftName: uniqueDatas[i].metadata.name,
                  nftPoint: 0,
                  isStaked: false,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });
              }
            } else {
              return res.status(200).json({
                "meta": {
                  "code": res.statusCode,
                  "status": res.status,
                  "message": "All NFTs data has been successfully fetched."
                },
              });
            }
            
            return res.status(200).json({
              "meta": {
                "code": res.statusCode,
                "status": res.status,
                "message": "Data successfully fetched."
              },
            });
          } catch (error) {
            console.error('Error fetching NFTs:', error);
            res.status(500).send({ error: 'Failed to fetch NFTs' });
          }
        }
      }
    }
  });

module.exports = router;
